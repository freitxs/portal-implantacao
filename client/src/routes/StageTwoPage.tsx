import React from "react";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InsertChartOutlinedIcon from "@mui/icons-material/InsertChartOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useToast } from "../components/ToastProvider";
import { api } from "../lib/api";
import dayjs from "../lib/dayjs";
import type { FileLog, OnboardingForm, UploadType } from "../types";
import { getStageAccess } from "./client/portalUtils";

const statusLabels = {
  ENVIADO: "Enviado",
  EM_ANALISE: "Em análise",
  AJUSTE_NECESSARIO: "Ajuste necessário",
  VALIDADO: "Validado",
  SUBSTITUIDO: "Substituído",
  NAO_ENVIADO: "Não enviado",
};

function getUpload(form: OnboardingForm | undefined, type: UploadType) {
  return form?.uploads?.find((item) => item.type === type && item.status !== "EXCLUIDO_ADMIN") ?? null;
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

function UploadAction({
  label,
  onUpload,
  loading,
}: {
  label: string;
  onUpload: (file: File) => void;
  loading: boolean;
}) {
  return (
    <Button component="label" variant="contained" startIcon={loading ? <CircularProgress size={18} /> : <CloudUploadRoundedIcon />} disabled={loading}>
      {label}
      <input
        hidden
        type="file"
        accept=".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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

function HistoryList({ logs }: { logs: FileLog[] }) {
  if (!logs.length) return <Typography color="text.secondary">Sem histórico registrado até o momento.</Typography>;

  return (
    <Stack spacing={1}>
      {logs.map((log) => (
        <Box key={log.id} sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between">
            <Typography sx={{ fontWeight: 800 }}>{statusLabels[log.status as keyof typeof statusLabels] ?? log.status}</Typography>
            <Typography color="text.secondary" sx={{ fontSize: 13 }}>
              {dayjs(log.createdAt).format("DD/MM/YYYY HH:mm")}
            </Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {log.user?.name ? `${log.user.name} • ` : ""}
            {log.message ?? log.action}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

export function StageTwoPage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formQuery = useQuery({
    queryKey: ["form", formId, "stage-two"],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = formQuery.data;
  const access = getStageAccess(form);
  const stageAvailable = access.stage02Released;
  const contractsUpload = getUpload(form, "ETAPA2_RELATORIO_CONTRATOS");
  const feesUpload = getUpload(form, "ETAPA2_RELATORIO_HONORARIOS");
  const contractLogs = (form?.fileLogs ?? []).filter((log) => log.type === "ETAPA2_RELATORIO_CONTRATOS");
  const feeLogs = (form?.fileLogs ?? []).filter((log) => log.type === "ETAPA2_RELATORIO_HONORARIOS");

  const uploadMutation = useMutation({
    mutationFn: async ({ type, file }: { type: UploadType; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return (
        await api.post(`/api/uploads/${formId}/uploads/${type}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      toast({ message: "Relatório enviado com sucesso.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "stage-two"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível concluir o envio do relatório.", severity: "error" });
    },
  });

  return (
    <AppShell title="Etapa 02 • Painéis e histórico" formId={formId}>
      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
              <Box sx={{ maxWidth: 860 }}>
                <Typography variant="h5">Etapa 02 • Painéis e histórico</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Esta etapa não possui treinamento. O cliente apenas baixa as orientações, extrai relatórios já presentes na rotina contábil e envia os arquivos para que a equipe Honorarium organize, valide e configure os painéis.
                </Typography>
              </Box>
              <Chip sx={{ alignSelf: { xs: "flex-start", lg: "center" }, maxWidth: "100%" }} label={stageAvailable ? "Próxima etapa disponível" : "Disponível após conclusão/liberação administrativa da Etapa 01"} color={stageAvailable ? "success" : "default"} />
            </Stack>
          </CardContent>
        </Card>

        {!stageAvailable ? (
          <Alert severity="info">
            A Etapa 02 ficará acessível após a conclusão da Etapa 01 e a respectiva liberação administrativa.
          </Alert>
        ) : (
          <>
            <Card>
              <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                  <Box>
                    <Typography variant="h6">Como funciona esta etapa</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                      O cliente prepara os relatórios conforme as orientações. A configuração técnica dos painéis e a validação do material seguem com a equipe Honorarium.
                    </Typography>
                  </Box>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/forms/${formId}/stage-two/instructions`, "etapa-02-instrucoes.txt")}>
                      Baixar instruções
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
              <Card>
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                    <InsertChartOutlinedIcon color="action" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 20 }}>Painel de Contratos</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                        Baixe o modelo de referência, extraia o relatório inicial e envie o arquivo para análise. A organização e a configuração do painel ficam com a equipe Honorarium.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/forms/${formId}/stage-two/templates/contratos`, "etapa-02-contratos-modelo.csv")}>
                      Baixar modelo
                    </Button>
                    <UploadAction label={contractsUpload ? "Enviar nova versão" : "Enviar relatório"} loading={uploadMutation.isPending} onUpload={(file) => uploadMutation.mutate({ type: "ETAPA2_RELATORIO_CONTRATOS", file })} />
                  </Stack>
                  <Chip label={statusLabels[(contractsUpload?.status ?? "NAO_ENVIADO") as keyof typeof statusLabels] ?? "Não enviado"} />
                  <Typography color="text.secondary" sx={{ mt: 1.25 }}>
                    {contractsUpload ? `${contractsUpload.filename} • atualização ${dayjs(contractsUpload.updatedAt ?? contractsUpload.createdAt).format("DD/MM/YYYY HH:mm")}` : "Aguardando o envio do relatório inicial."}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, mt: 2, mb: 1 }}>Histórico</Typography>
                  <HistoryList logs={contractLogs} />
                </CardContent>
              </Card>

              <Card>
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
                    <AssignmentTurnedInOutlinedIcon color="action" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 900, fontSize: 20 }}>Painel de Honorários</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                        Envie o relatório inicial no formato indicado para que a equipe Honorarium valide o material e prepare a configuração do painel correspondente.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={() => downloadBinary(`/api/uploads/forms/${formId}/stage-two/templates/honorarios`, "etapa-02-honorarios-modelo.csv")}>
                      Baixar modelo
                    </Button>
                    <UploadAction label={feesUpload ? "Enviar nova versão" : "Enviar relatório"} loading={uploadMutation.isPending} onUpload={(file) => uploadMutation.mutate({ type: "ETAPA2_RELATORIO_HONORARIOS", file })} />
                  </Stack>
                  <Chip label={statusLabels[(feesUpload?.status ?? "NAO_ENVIADO") as keyof typeof statusLabels] ?? "Não enviado"} />
                  <Typography color="text.secondary" sx={{ mt: 1.25 }}>
                    {feesUpload ? `${feesUpload.filename} • atualização ${dayjs(feesUpload.updatedAt ?? feesUpload.createdAt).format("DD/MM/YYYY HH:mm")}` : "Aguardando o envio do relatório inicial."}
                  </Typography>
                  <Typography sx={{ fontWeight: 800, mt: 2, mb: 1 }}>Histórico</Typography>
                  <HistoryList logs={feeLogs} />
                </CardContent>
              </Card>
            </Box>

            <Button variant="outlined" onClick={() => nav(`/cronograma/${formId}`)}>
              Voltar ao cronograma
            </Button>
          </>
        )}
      </Stack>
    </AppShell>
  );
}
