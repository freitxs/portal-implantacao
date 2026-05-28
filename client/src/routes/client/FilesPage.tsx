import React from "react";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import CircularProgress from "@mui/material/CircularProgress";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FileOpenOutlinedIcon from "@mui/icons-material/FileOpenOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import { Box, Button, Card, CardContent, Checkbox, Chip, FormControlLabel, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { useToast } from "../../components/ToastProvider";
import {
  HONORARIUM_CONTRACT_TEMPLATE,
  HONORARIUM_PROPOSAL_MODELS,
  getHonorariumProposalModelById,
} from "../../domain/templates/honorariumTemplates";
import { api } from "../../lib/api";
import dayjs from "../../lib/dayjs";
import type { FileLog, OnboardingForm, Upload, UploadStatus, UploadType } from "../../types";
import { getReviewChecklist } from "../Wizard/reviewChecklist";

const statusLabels: Record<UploadStatus, string> = {
  NAO_ENVIADO: "Não enviado",
  ENVIADO: "Enviado",
  EM_ANALISE: "Em análise",
  AJUSTE_NECESSARIO: "Ajuste necessário",
  VALIDADO: "Validado",
  SUBSTITUIDO: "Substituído",
  EXCLUIDO_ADMIN: "Excluído pelo admin",
};

const statusColors: Record<UploadStatus, "default" | "success" | "warning"> = {
  NAO_ENVIADO: "default",
  ENVIADO: "default",
  EM_ANALISE: "warning",
  AJUSTE_NECESSARIO: "warning",
  VALIDADO: "success",
  SUBSTITUIDO: "default",
  EXCLUIDO_ADMIN: "default",
};

function formatBytes(bytes?: number) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function getUpload(form: OnboardingForm | undefined, type: UploadType) {
  return form?.uploads?.find((item) => item.type === type && item.status !== "EXCLUIDO_ADMIN");
}

async function downloadBinary(url: string, filename: string) {
  const response = await api.get(url, { responseType: "blob" });
  const blob = new Blob([response.data]);
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

async function openPublicFileWithLog(logUrl: string, publicPath: string) {
  await api.post(logUrl);
  window.open(publicPath, "_blank", "noopener,noreferrer");
}

function HistoryList({ logs }: { logs: FileLog[] }) {
  return (
    <Stack spacing={1}>
      {logs.length ? logs.map((log) => (
        <Box key={log.id} sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
            <Typography sx={{ fontWeight: 800 }}>{statusLabels[log.status]}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
              {dayjs(log.createdAt).format("DD/MM/YYYY HH:mm")}
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5, overflowWrap: "anywhere" }}>
            {log.user?.name ? `${log.user.name} • ` : ""}{log.message ?? log.action}
          </Typography>
        </Box>
      )) : (
        <Typography color="text.secondary">Sem histórico registrado até o momento.</Typography>
      )}
    </Stack>
  );
}

function UploadButton({
  label,
  accept,
  onUpload,
  loading,
  disabled,
}: {
  label: string;
  accept: string;
  onUpload: (file: File) => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <Button component="label" variant="contained" startIcon={loading ? <CircularProgress size={18} /> : <CloudUploadRoundedIcon />} disabled={disabled || loading}>
      {label}
      <input
        hidden
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          onUpload(file);
          event.currentTarget.value = "";
        }}
      />
    </Button>
  );
}

export function FilesPage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formQuery = useQuery({
    queryKey: ["form", formId, "file-center"],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
    staleTime: 30_000,
  });

  const form = formQuery.data;
  const uploadsState = form?.stepData?.uploads ?? {};
  const editable = form?.status !== "ENVIADO";
  const checklist = form ? getReviewChecklist(form) : null;
  const filesSection = checklist?.sections.find((section) => section.key === "files") ?? null;
  const onlyFilesSectionPending = Boolean(
    checklist &&
      checklist.sections
        .filter((section) => section.status !== "CONCLUIDO")
        .every((section) => section.key === "files")
  );

  const contractUpload = getUpload(form, "CONTRATO");
  const proposalUpload = getUpload(form, "PROPOSTA");
  const clientsUpload = getUpload(form, "RELACAO_CLIENTES");
  const contractLogs = (form?.fileLogs ?? []).filter((log) => log.type === "CONTRATO");
  const proposalLogs = (form?.fileLogs ?? []).filter((log) => log.type === "PROPOSTA");
  const clientsLogs = (form?.fileLogs ?? []).filter((log) => log.type === "RELACAO_CLIENTES");
  const canAcknowledgeContract = Boolean(uploadsState.contractStandardViewedAt);
  const selectedProposalModel = getHonorariumProposalModelById(uploadsState.selectedProposalTemplateId);

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: UploadType; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return (await api.post(`/api/uploads/${formId}/uploads/${type}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })).data as { upload: Upload };
    },
    onSuccess: () => {
      toast({ message: "Arquivo enviado com sucesso.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível concluir o envio.", severity: "error" });
    },
  });

  const uploadsStateMutation = useMutation({
    mutationFn: async (nextUploadsState: any) =>
      (await api.put(`/api/forms/${formId}/step/3`, {
        stepIndex: 3,
        data: { uploads: nextUploadsState },
        currentStep: Math.max(form?.currentStep ?? 3, 3),
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar esta seção.", severity: "error" });
    },
  });

  const proposalSelectionMutation = useMutation({
    mutationFn: async ({ selectedModelId, noOwnModel }: { selectedModelId: string; noOwnModel: boolean }) =>
      (await api.post(`/api/uploads/forms/${formId}/templates/proposal-selection`, {
        selectedModelId,
        noOwnModel,
      })).data,
    onSuccess: () => {
      toast({ message: "Modelo de proposta atualizado.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar a proposta.", severity: "error" });
    },
  });

  const acknowledgeContractMutation = useMutation({
    mutationFn: async () => (await api.post(`/api/uploads/forms/${formId}/contract-standard/acknowledge`, { acknowledged: true })).data,
    onSuccess: () => {
      toast({ message: "Ciência registrada com sucesso.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível registrar a ciência.", severity: "error" });
    },
  });

  async function handleTemplateDownload() {
    await downloadBinary(`/api/uploads/forms/${formId}/templates/relacao-clientes`, "Planilha Modelo - Importacao de Empresas.xlsx");
    queryClient.invalidateQueries({ queryKey: ["form", formId] });
    queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
  }

  async function handleContractDownload() {
    await downloadBinary(`/api/uploads/forms/${formId}/contract-standard/download`, HONORARIUM_CONTRACT_TEMPLATE.filename);
    queryClient.invalidateQueries({ queryKey: ["form", formId] });
    queryClient.invalidateQueries({ queryKey: ["form", formId, "file-center"] });
  }

  return (
    <AppShell title="Central de Arquivos da Trilha" formId={formId}>
      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
              <Box sx={{ maxWidth: 780 }}>
                <Typography variant="h5">Central de Arquivos</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Reúna proposta, contrato e relação de clientes em um único ambiente.
                </Typography>
              </Box>
              <Button variant="outlined" onClick={() => nav(`/wizard/${formId}`)}>
                Retornar à Etapa 01
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 2 }}>
          <Card>
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                  <ArticleOutlinedIcon color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>Modelo de proposta comercial</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Base utilizada para organizar a proposta comercial da implantação.
                    </Typography>
                    <Chip label="Necessário para avançar" size="small" sx={{ mt: 1.5 }} />
                  </Box>
                </Stack>
                <Chip sx={{ alignSelf: { xs: "flex-start", lg: "center" }, maxWidth: "100%" }} label={statusLabels[proposalUpload?.status ?? "NAO_ENVIADO"]} color={statusColors[proposalUpload?.status ?? "NAO_ENVIADO"]} />
              </Stack>

              <Box sx={{ mt: 2.5, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" } }}>
                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Arquivo atual</Typography>
                  {proposalUpload ? (
                    <Stack spacing={1.25}>
                      <Typography sx={{ overflowWrap: "anywhere" }}>{proposalUpload.filename}</Typography>
                      <Typography color="text.secondary">{formatBytes(proposalUpload.size)} • atualizado em {dayjs(proposalUpload.updatedAt ?? proposalUpload.createdAt).format("DD/MM/YYYY HH:mm")}</Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/download/${proposalUpload.id}`, proposalUpload.filename)}>
                          Baixar arquivo
                        </Button>
                        {editable ? (
                          <UploadButton
                            label="Enviar nova versão"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            loading={uploadMutation.isPending}
                            onUpload={(file) => uploadMutation.mutate({ type: "PROPOSTA", file })}
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={1.25}>
                      <Typography color="text.secondary">Você pode enviar um modelo próprio ou escolher um modelo Honorarium.</Typography>
                      {editable ? (
                        <UploadButton
                          label="Enviar modelo próprio"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          loading={uploadMutation.isPending}
                          onUpload={(file) => uploadMutation.mutate({ type: "PROPOSTA", file })}
                        />
                      ) : null}
                    </Stack>
                  )}
                </Box>

                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Caso não possua modelo próprio</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(uploadsState.noProposalTemplate)}
                        disabled={!editable}
                        onChange={(_, checked) => {
                          if (!checked) {
                            uploadsStateMutation.mutate({
                              ...uploadsState,
                              noProposalTemplate: false,
                              selectedProposalTemplateId: "",
                              selectedProposalTemplateName: "",
                              selectedProposalTemplateFilename: "",
                            });
                            return;
                          }
                          const defaultModel = selectedProposalModel ?? HONORARIUM_PROPOSAL_MODELS[0];
                          proposalSelectionMutation.mutate({
                            selectedModelId: defaultModel.id,
                            noOwnModel: true,
                          });
                        }}
                      />
                    }
                    label="Não possuo modelo próprio de proposta"
                    slotProps={{ typography: { sx: { lineHeight: 1.4, overflowWrap: "anywhere" } } }}
                  />
                  {uploadsState.noProposalTemplate ? (
                    <Box sx={{ mt: 1.5, display: "grid", gap: 1.5 }}>
                      {HONORARIUM_PROPOSAL_MODELS.map((item) => {
                        const selected = uploadsState.selectedProposalTemplateId === item.id;
                        return (
                          <Box
                            key={item.id}
                            sx={{
                              border: selected ? "1px solid rgba(19,78,54,0.35)" : "1px solid rgba(15,23,42,0.08)",
                              borderRadius: "20px",
                              p: 2,
                              backgroundColor: selected ? "rgba(19,78,54,0.04)" : "transparent",
                            }}
                          >
                            <Stack spacing={1.2}>
                              <Box>
                                <Typography sx={{ fontWeight: 800 }}>{item.name}</Typography>
                                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                                  {item.description}
                                </Typography>
                              </Box>
                              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                                <Button
                                  variant="outlined"
                                  startIcon={<FileOpenOutlinedIcon />}
                                  onClick={() => openPublicFileWithLog(`/api/uploads/forms/${formId}/proposal-models/${item.id}/viewed`, item.publicPath)}
                                >
                                  Visualizar modelo
                                </Button>
                                <Button
                                  variant={selected ? "contained" : "outlined"}
                                  color={selected ? "secondary" : "inherit"}
                                  disabled={!editable}
                                  onClick={() =>
                                    proposalSelectionMutation.mutate({
                                      selectedModelId: item.id,
                                      noOwnModel: true,
                                    })
                                  }
                                >
                                  {selected ? "Modelo selecionado" : "Escolher este modelo"}
                                </Button>
                              </Stack>
                            </Stack>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" sx={{ mt: 1 }}>
                      Marque a opção acima para visualizar os modelos disponíveis.
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Histórico</Typography>
                <HistoryList logs={proposalLogs} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                  <AssignmentOutlinedIcon color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>Modelo de contrato</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Base contratual utilizada na implantação inicial.
                    </Typography>
                    <Chip label="Necessário para avançar" size="small" sx={{ mt: 1.5 }} />
                  </Box>
                </Stack>
                <Chip sx={{ alignSelf: { xs: "flex-start", lg: "center" }, maxWidth: "100%" }} label={statusLabels[contractUpload?.status ?? "NAO_ENVIADO"]} color={statusColors[contractUpload?.status ?? "NAO_ENVIADO"]} />
              </Stack>

              <Box sx={{ mt: 2.5, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" } }}>
                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Arquivo atual</Typography>
                  {contractUpload ? (
                    <Stack spacing={1.25}>
                      <Typography sx={{ overflowWrap: "anywhere" }}>{contractUpload.filename}</Typography>
                      <Typography color="text.secondary">{formatBytes(contractUpload.size)} • atualizado em {dayjs(contractUpload.updatedAt ?? contractUpload.createdAt).format("DD/MM/YYYY HH:mm")}</Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/download/${contractUpload.id}`, contractUpload.filename)}>
                          Baixar arquivo
                        </Button>
                        {editable ? (
                          <UploadButton
                            label="Enviar nova versão"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            loading={uploadMutation.isPending}
                            onUpload={(file) => uploadMutation.mutate({ type: "CONTRATO", file })}
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack spacing={1.25}>
                      <Typography color="text.secondary">Você pode enviar um modelo próprio ou utilizar o contrato padrão Honorarium.</Typography>
                      {editable ? (
                        <UploadButton
                          label="Enviar modelo próprio"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          loading={uploadMutation.isPending}
                          onUpload={(file) => uploadMutation.mutate({ type: "CONTRATO", file })}
                        />
                      ) : null}
                    </Stack>
                  )}
                </Box>

                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Caso não tenha modelo próprio</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(uploadsState.noContractTemplate)}
                        disabled={!editable}
                        onChange={(_, checked) =>
                          uploadsStateMutation.mutate({
                            ...uploadsState,
                            noContractTemplate: checked,
                            contractStandardViewedAt: checked ? uploadsState.contractStandardViewedAt : "",
                            contractStandardDownloadedAt: checked ? uploadsState.contractStandardDownloadedAt : "",
                            contractStandardFilename: checked ? uploadsState.contractStandardFilename : "",
                            contractAcknowledged: checked ? uploadsState.contractAcknowledged : false,
                            contractAcknowledgedAt: checked ? uploadsState.contractAcknowledgedAt : "",
                          })
                        }
                      />
                    }
                    label="Não tenho modelo próprio de contrato"
                    slotProps={{ typography: { sx: { lineHeight: 1.4, overflowWrap: "anywhere" } } }}
                  />
                  {uploadsState.noContractTemplate ? (
                    <Box sx={{ mt: 1.5, border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2 }}>
                      <Typography sx={{ fontWeight: 800 }}>{HONORARIUM_CONTRACT_TEMPLATE.name}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {HONORARIUM_CONTRACT_TEMPLATE.description}
                      </Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                        <Button variant="outlined" startIcon={<FileOpenOutlinedIcon />} onClick={() => openPublicFileWithLog(`/api/uploads/forms/${formId}/contract-standard/viewed`, HONORARIUM_CONTRACT_TEMPLATE.publicPath)}>
                          Visualizar contrato
                        </Button>
                        <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={handleContractDownload}>
                          Baixar contrato
                        </Button>
                      </Stack>
                    </Box>
                  ) : null}
                  <FormControlLabel
                    sx={{ mt: 1.5, alignItems: "flex-start" }}
                    control={
                      <Checkbox
                        checked={Boolean(uploadsState.contractAcknowledged)}
                        disabled={!editable || !canAcknowledgeContract}
                        onChange={(_, checked) => {
                          if (checked) acknowledgeContractMutation.mutate();
                        }}
                      />
                    }
                    label="Declaro que visualizei o contrato padrão Honorarium, autorizo sua utilização como base e assumo responsabilidade por revisar e realizar os ajustes que considerar necessários."
                    slotProps={{ typography: { sx: { lineHeight: 1.45, overflowWrap: "anywhere" } } }}
                  />
                </Box>
              </Box>

              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Histórico</Typography>
                <HistoryList logs={contractLogs} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                  <GridOnOutlinedIcon color="action" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 900, fontSize: 20, lineHeight: 1.2 }}>Planilha modelo de relação de clientes</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      Base inicial para consolidar a relação de clientes da implantação.
                    </Typography>
                    <Chip label="Necessário para avançar" size="small" sx={{ mt: 1.5 }} />
                  </Box>
                </Stack>
                <Chip sx={{ alignSelf: { xs: "flex-start", lg: "center" }, maxWidth: "100%" }} label={statusLabels[clientsUpload?.status ?? "NAO_ENVIADO"]} color={statusColors[clientsUpload?.status ?? "NAO_ENVIADO"]} />
              </Stack>

              <Box sx={{ mt: 2.5, display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.15fr 0.85fr" } }}>
                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Modelo atualizado</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                    Baixe o modelo, preencha os campos solicitados e faça o envio em CSV ou XLSX.
                  </Typography>
                  <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={handleTemplateDownload}>
                    Baixar modelo atualizado
                  </Button>
                </Box>

                <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: "20px", p: 2.25 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Upload da planilha preenchida</Typography>
                  {clientsUpload ? (
                    <Stack spacing={1.25}>
                      <Typography sx={{ overflowWrap: "anywhere" }}>{clientsUpload.filename}</Typography>
                      <Typography color="text.secondary">{formatBytes(clientsUpload.size)} • atualizado em {dayjs(clientsUpload.updatedAt ?? clientsUpload.createdAt).format("DD/MM/YYYY HH:mm")}</Typography>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/download/${clientsUpload.id}`, clientsUpload.filename)}>
                          Baixar envio
                        </Button>
                        {editable ? (
                          <UploadButton
                            label="Enviar nova planilha"
                            accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            loading={uploadMutation.isPending}
                            onUpload={(file) => uploadMutation.mutate({ type: "RELACAO_CLIENTES", file })}
                          />
                        ) : null}
                      </Stack>
                    </Stack>
                  ) : editable ? (
                    <UploadButton
                      label="Enviar planilha preenchida"
                      accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      loading={uploadMutation.isPending}
                      onUpload={(file) => uploadMutation.mutate({ type: "RELACAO_CLIENTES", file })}
                    />
                  ) : (
                    <Typography color="text.secondary">Aguardando envio da planilha preenchida.</Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ mt: 2.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>Histórico</Typography>
                <HistoryList logs={clientsLogs} />
              </Box>
            </CardContent>
          </Card>
        </Box>

        {onlyFilesSectionPending ? (
          <Card>
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box sx={{ maxWidth: 760 }}>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    Retorno para a revisão da etapa
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.8 }}>
                    Assim que esta área estiver concluída, você já pode retornar para a revisão antes do agendamento.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="secondary"
                  disabled={filesSection?.status !== "CONCLUIDO"}
                  onClick={() => nav(`/wizard/${formId}`)}
                >
                  Prosseguir para revisão
                </Button>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  );
}
