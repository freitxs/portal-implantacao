import React from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Tab, Tabs, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { useToast } from "../../components/ToastProvider";
import { getHonorariumProposalModelById } from "../../domain/templates/honorariumTemplates";
import { api, API_URL } from "../../lib/api";
import dayjs from "../../lib/dayjs";
import type { FileLog, ImplementationLog, OnboardingForm, StageStatus, UploadType } from "../../types";
import { AdminHonorariosSimulationTab } from "./AdminHonorariosSimulationTab";
import { AdminScheduleCalendarCard } from "./AdminScheduleCalendarCard";

function safeJsonParse<T>(value: unknown, fallback: T): T {
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return (value ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined && value !== false;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function joinValues(list?: string[]) {
  return Array.isArray(list) && list.length ? list.join(", ") : null;
}

function statusLabel(status?: string) {
  return {
    NAO_ENVIADO: "Não enviado",
    ENVIADO: "Enviado",
    EM_ANALISE: "Em análise",
    AJUSTE_NECESSARIO: "Ajuste necessário",
    VALIDADO: "Validado",
    SUBSTITUIDO: "Substituído",
    EXCLUIDO_ADMIN: "Excluído pelo admin",
  }[status ?? "NAO_ENVIADO"] ?? status ?? "Não enviado";
}

function stageStatusLabel(status: StageStatus) {
  return {
    NAO_INICIADA: "Não iniciada",
    EM_PREENCHIMENTO: "Em preenchimento",
    ENVIADA_PELO_CLIENTE: "Enviada pelo cliente",
    EM_ANALISE_IMPLANTACAO: "Em análise pela implantação",
    AJUSTE_NECESSARIO: "Ajuste necessário",
    TREINAMENTO_AGENDADO: "Treinamento agendado",
    TREINAMENTO_REALIZADO: "Treinamento realizado",
    AGUARDANDO_ACEITE_CONCLUSAO: "Aguardando aceite de conclusão",
    CONCLUIDA: "Concluída",
    PROXIMA_ETAPA_DISPONIVEL: "Próxima etapa disponível",
  }[status];
}

function implementationLogSummary(log: ImplementationLog) {
  const metadata = log.metadata ?? {};

  switch (log.action) {
    case "ALTERACAO_RESPOSTAS_ESTRUTURADAS":
      return metadata.changedKeys?.length ? `Campos atualizados: ${metadata.changedKeys.join(", ")}` : "Respostas estruturadas atualizadas.";
    case "UPLOAD_ARQUIVO":
      return metadata.filename ? `Arquivo enviado: ${metadata.filename}` : "Arquivo enviado.";
    case "ENVIO_NOVA_VERSAO_ARQUIVO":
      return metadata.filename ? `Nova versão enviada: ${metadata.filename}` : "Nova versão de arquivo enviada.";
    case "VALIDACAO_ARQUIVO":
      return "Arquivo validado pela implantação.";
    case "SOLICITACAO_AJUSTE_ARQUIVO":
      return metadata.message || "Ajuste solicitado para o arquivo.";
    case "EXCLUSAO_ADMINISTRATIVA_ARQUIVO":
      return "Arquivo removido administrativamente.";
    case "VISUALIZACAO_CONTRATO_PADRAO":
      return "Contrato padrão visualizado.";
    case "VISUALIZACAO_MODELO_PROPOSTA":
      return metadata.modelName ? `Modelo de proposta visualizado: ${metadata.modelName}.` : "Modelo de proposta visualizado.";
    case "DOWNLOAD_MODELO_PROPOSTA":
      return metadata.modelName ? `Modelo de proposta baixado: ${metadata.modelName}.` : "Modelo de proposta baixado.";
    case "ESCOLHA_MODELO_PROPOSTA":
      return metadata.selectedModelName ? `Modelo de proposta escolhido: ${metadata.selectedModelName}.` : "Modelo de proposta escolhido.";
    case "DOWNLOAD_CONTRATO_PADRAO":
      return "Contrato padrão baixado.";
    case "ACEITE_CONTRATO_PADRAO_HONORARIUM":
      return "Ciência do contrato padrão registrada.";
    case "AGENDAMENTO_INICIAL":
      return metadata.startAt ? `Treinamento reservado para ${dayjs(metadata.startAt).format("DD/MM/YYYY HH:mm")}.` : "Treinamento reservado.";
    case "ALTERACAO_AGENDAMENTO_ADMIN":
      return metadata.startAt ? `Horário ajustado para ${dayjs(metadata.startAt).format("DD/MM/YYYY HH:mm")}.` : "Horário do treinamento ajustado.";
    case "CONFIRMACAO_TREINAMENTO":
      return "Treinamento confirmado pela equipe.";
    case "TREINAMENTO_REALIZADO":
      return "Treinamento marcado como realizado.";
    case "CANCELAMENTO_TREINAMENTO":
      return "Treinamento cancelado.";
    case "ACEITE_CONCLUSAO_ETAPA":
      return "Conclusão da Etapa 01 aceita pelo cliente.";
    case "LIBERACAO_PROXIMA_ETAPA":
      return "Próxima etapa liberada administrativamente.";
    case "REABERTURA_ETAPA":
      return "Etapa reaberta administrativamente.";
    case "DOWNLOAD_MODELO_RELEVANTE":
      return metadata.label ? `Material baixado: ${metadata.label}` : "Material de apoio baixado.";
    case "DOWNLOAD_ARQUIVO":
      return metadata.filename ? `Arquivo baixado: ${metadata.filename}` : "Arquivo baixado.";
    default:
      return "";
  }
}

function getStageStatuses(form: any, appointment?: any | null) {
  const stepData = form?.stepData ?? {};
  const stage01Completed = stepData.stage01Completion?.status === "CONCLUIDA";
  const stage02Released = Boolean(stepData.stageAccess?.stage2Released && stage01Completed);
  const stage02Completed = stepData.stage02?.status === "CONCLUIDA" || Boolean(stepData.stageAccess?.stage3Released && stage02Released);
  const stage03Released = Boolean(stepData.stageAccess?.stage3Released && stage02Completed);
  const stage03Completed = stepData.stage03?.status === "CONCLUIDA";
  const stage2Uploads = (form?.uploads ?? []).filter((upload: any) => ["ETAPA2_RELATORIO_CONTRATOS", "ETAPA2_RELATORIO_HONORARIOS"].includes(upload.type) && upload.status !== "EXCLUIDO_ADMIN");
  const stage3Integrations = Array.isArray(stepData.stage3?.integrations) ? stepData.stage3.integrations : [];

  let stage1: StageStatus = "NAO_INICIADA";
  if (stage01Completed) stage1 = "CONCLUIDA";
  else if (appointment?.status === "REALIZADO") stage1 = "TREINAMENTO_REALIZADO";
  else if (appointment?.status === "CONFIRMADO_EQUIPE") stage1 = "AGUARDANDO_ACEITE_CONCLUSAO";
  else if (appointment && ["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO"].includes(appointment.status)) stage1 = "TREINAMENTO_AGENDADO";
  else if (form?.currentStep >= 1) stage1 = "EM_PREENCHIMENTO";

  let stage2: StageStatus = "NAO_INICIADA";
  if (stage02Completed) stage2 = "CONCLUIDA";
  else if (stage02Released && stage2Uploads.some((upload: any) => upload.status === "AJUSTE_NECESSARIO")) stage2 = "AJUSTE_NECESSARIO";
  else if (stage02Released && stage2Uploads.some((upload: any) => ["EM_ANALISE", "VALIDADO", "SUBSTITUIDO"].includes(upload.status))) stage2 = "EM_ANALISE_IMPLANTACAO";
  else if (stage02Released && stage2Uploads.some((upload: any) => upload.status === "ENVIADO")) stage2 = "ENVIADA_PELO_CLIENTE";
  else if (stage02Released) stage2 = "PROXIMA_ETAPA_DISPONIVEL";

  let stage3: StageStatus = "NAO_INICIADA";
  if (stage03Completed) stage3 = "CONCLUIDA";
  else if (stage03Released && stage3Integrations.some((item: any) => item.status === "AJUSTE_NECESSARIO")) stage3 = "AJUSTE_NECESSARIO";
  else if (stage03Released && stage3Integrations.some((item: any) => ["EM_CONFIGURACAO", "CONFIGURADA"].includes(item.status))) stage3 = "EM_ANALISE_IMPLANTACAO";
  else if (stage03Released && stage3Integrations.some((item: any) => item.status === "DADOS_ENVIADOS")) stage3 = "ENVIADA_PELO_CLIENTE";
  else if (stage03Released) stage3 = "PROXIMA_ETAPA_DISPONIVEL";

  return { stage1, stage2, stage3, stage02Released, stage03Released };
}

function getCurrentStageTitle(statuses: ReturnType<typeof getStageStatuses>) {
  if (statuses.stage3 !== "NAO_INICIADA") return "Etapa 03 • Automações e integrações";
  if (statuses.stage2 !== "NAO_INICIADA") return "Etapa 02 • Painéis e histórico";
  return "Etapa 01 • Configuração inicial";
}

function DetailSection({ title, rows }: { title: string; rows: Array<{ label: string; value: React.ReactNode }> }) {
  if (!rows.length) return null;

  return (
    <Card>
      <CardContent>
        <Typography sx={{ fontWeight: 900 }}>{title}</Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={0.9}>
          {rows.map((row) => (
            <Typography key={row.label} color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
              <strong>{row.label}:</strong> {row.value}
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

function OperationalLogPanel({ logs }: { logs: ImplementationLog[] }) {
  if (!logs.length) return <Typography color="text.secondary">Nenhum log operacional registrado.</Typography>;

  return (
    <Stack spacing={0.9}>
      {logs.map((log) => (
        <Box key={log.id}>
          <Typography color="text.secondary">
            {dayjs(log.createdAt).format("DD/MM/YYYY HH:mm:ss")} | {log.user?.name ?? "Sistema"} | {log.action}
          </Typography>
          {implementationLogSummary(log) ? <Typography color="text.secondary">{implementationLogSummary(log)}</Typography> : null}
        </Box>
      ))}
    </Stack>
  );
}

async function downloadUpload(uploadId: string, filename: string) {
  const response = await api.get(`/api/uploads/download/${uploadId}`, { responseType: "blob" });
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function FileHistory({ logs }: { logs: FileLog[] }) {
  if (!logs.length) return <Typography color="text.secondary">Nenhum movimento registrado para este arquivo.</Typography>;

  return (
    <Stack spacing={0.8}>
      {logs.map((log) => (
        <Typography key={log.id} color="text.secondary">
          {dayjs(log.createdAt).format("DD/MM/YYYY HH:mm:ss")} • {log.user?.name ?? "Sistema"} • {statusLabel(log.status)} • {log.message ?? log.action}
        </Typography>
      ))}
    </Stack>
  );
}

function UploadAdminCard({
  formId,
  type,
  title,
  upload,
  logs,
  refresh,
}: {
  formId: string;
  type: UploadType;
  title: string;
  upload?: any;
  logs: FileLog[];
  refresh: () => void;
}) {
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return (
        await api.post(`/api/uploads/${formId}/uploads/${type}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data;
    },
    onSuccess: () => {
      toast({ message: "Arquivo atualizado com sucesso.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar o arquivo.", severity: "error" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: "VALIDADO" | "AJUSTE_NECESSARIO") =>
      (await api.post(`/api/uploads/${formId}/uploads/${type}/status`, { status })).data,
    onSuccess: () => {
      toast({ message: "Status do arquivo atualizado.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar o status.", severity: "error" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => (await api.delete(`/api/uploads/${formId}/uploads/${type}`)).data,
    onSuccess: () => {
      toast({ message: "Arquivo removido administrativamente.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível remover o arquivo.", severity: "error" });
    },
  });

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography sx={{ fontWeight: 900 }}>{title}</Typography>
            {upload?.filename ? (
              <>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  {upload.filename}
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.25 }}>
                  Status atual: {statusLabel(upload?.status)}
                </Typography>
              </>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Sem arquivo ativo nesta seção.
              </Typography>
            )}
          </Box>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            {upload?.id ? (
              <Button variant="outlined" onClick={() => downloadUpload(upload.id, upload.filename)}>
                Baixar
              </Button>
            ) : null}
            <Button variant="outlined" component="label">
              Substituir
              <input
                hidden
                type="file"
                accept={
                  type === "RELACAO_CLIENTES"
                    ? ".csv,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                }
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  uploadMutation.mutate(file);
                  event.currentTarget.value = "";
                }}
              />
            </Button>
            <Button variant="outlined" color="success" disabled={!upload?.id} onClick={() => statusMutation.mutate("VALIDADO")}>
              Validar
            </Button>
            <Button variant="outlined" color="warning" disabled={!upload?.id} onClick={() => statusMutation.mutate("AJUSTE_NECESSARIO")}>
              Solicitar ajuste
            </Button>
            <Button variant="outlined" color="error" disabled={!upload?.id} onClick={() => deleteMutation.mutate()}>
              Excluir
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 1.5 }} />
        <Typography sx={{ fontWeight: 800, mb: 1 }}>Histórico do arquivo</Typography>
        <FileHistory logs={logs} />
      </CardContent>
    </Card>
  );
}

export function AdminFormDetailPage() {
  const { formId } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"overview" | "simulation">("overview");

  const query = useQuery({
    queryKey: ["adminForm", formId],
    enabled: Boolean(formId),
    queryFn: async () => (await api.get(`/api/admin/forms/${formId}`)).data as { form: OnboardingForm & { user: any } },
    staleTime: 30_000,
  });

  const form = query.data?.form as any;
  const appointment = form?.appointment ?? null;
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["adminForm", formId] });
    queryClient.invalidateQueries({ queryKey: ["form", formId] });
    queryClient.invalidateQueries({ queryKey: ["scheduleAvailability", formId] });
    queryClient.invalidateQueries({ queryKey: ["form", formId, "schedule"] });
  };

  const emailStep = form?.stepData?.email ?? {};
  const page1 = form?.stepData?.page1 ?? {};
  const systems = page1.systems ?? {};
  const page2 = form?.stepData?.page2 ?? {};
  const uploadsState = form?.stepData?.uploads ?? {};
  const emailUsers = asArray<any>(emailStep.users);
  const uploads = Array.isArray(form?.uploads) ? form.uploads : [];
  const fileLogs = Array.isArray(form?.fileLogs) ? form.fileLogs : [];
  const implementationLogs = Array.isArray(form?.implementationLogs) ? form.implementationLogs : [];
  const history = Array.isArray(form?.history) ? form.history : [];
  const stageAcceptances = Array.isArray(form?.stageAcceptances) ? form.stageAcceptances : [];
  const stageStatuses = getStageStatuses(form, appointment);
  const currentStageTitle = getCurrentStageTitle(stageStatuses);
  const latestAcceptance = stageAcceptances[0];
  const summarySnapshot = safeJsonParse<any>(latestAcceptance?.summarySnapshot, null);
  const selectedProposalModel = getHonorariumProposalModelById(uploadsState?.selectedProposalTemplateId);

  const contract = uploads.find((upload: any) => upload?.type === "CONTRATO" && upload?.status !== "EXCLUIDO_ADMIN");
  const proposal = uploads.find((upload: any) => upload?.type === "PROPOSTA" && upload?.status !== "EXCLUIDO_ADMIN");
  const clientList = uploads.find((upload: any) => upload?.type === "RELACAO_CLIENTES" && upload?.status !== "EXCLUIDO_ADMIN");

  const releaseMutation = useMutation({
    mutationFn: async (stageAccess: Record<string, boolean>) => (await api.post(`/api/forms/${formId}/stage-access`, { data: { stageAccess } })).data,
    onSuccess: () => {
      toast({ message: "Liberação da trilha atualizada.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar a liberação da trilha.", severity: "error" });
      refresh();
    },
  });

  if (query.isLoading) {
    return (
      <AppShell title="Admin • Detalhe">
        <Typography>Carregando...</Typography>
      </AppShell>
    );
  }

  if (!form) {
    return (
      <AppShell title="Admin • Detalhe">
        <Typography>Formulário não encontrado.</Typography>
      </AppShell>
    );
  }

  const clientRows = [
    hasValue(form.user?.name) ? { label: "Cliente", value: form.user.name } : null,
    hasValue(form.user?.email) ? { label: "E-mail", value: form.user.email } : null,
    hasValue(form.stepData?.office?.officeName) ? { label: "Escritório", value: form.stepData.office.officeName } : null,
    hasValue(form.stepData?.office?.cityUf) ? { label: "Cidade/UF", value: form.stepData.office.cityUf } : null,
    hasValue(form.stepData?.office?.responsibleName ?? form.user?.name) ? { label: "Responsável pelo preenchimento", value: form.stepData?.office?.responsibleName ?? form.user?.name } : null,
    hasValue(form.stepData?.office?.whatsapp) ? { label: "WhatsApp", value: form.stepData.office.whatsapp } : null,
    hasValue(form.stepData?.office?.activeCompanies) ? { label: "Empresas ativas", value: form.stepData.office.activeCompanies } : null,
    { label: "Etapa atual", value: currentStageTitle },
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const summaryRows = [
    hasValue(summarySnapshot?.systems?.erpSelected ?? joinValues(systems.erpContabil?.values))
      ? { label: "ERP selecionado", value: summarySnapshot?.systems?.erpSelected ?? joinValues(systems.erpContabil?.values)! }
      : null,
    hasValue(summarySnapshot?.systems?.erpEnvironment ?? page1.erpEnvironment)
      ? { label: "Ambiente do ERP", value: summarySnapshot?.systems?.erpEnvironment ?? page1.erpEnvironment }
      : null,
    hasValue(Array.isArray(summarySnapshot?.pricing?.criteria) && summarySnapshot.pricing.criteria.length ? summarySnapshot.pricing.criteria.join(", ") : joinValues(page2.pricingFactors))
      ? { label: "Critérios de precificação", value: Array.isArray(summarySnapshot?.pricing?.criteria) && summarySnapshot.pricing.criteria.length ? summarySnapshot.pricing.criteria.join(", ") : joinValues(page2.pricingFactors)! }
      : null,
    hasValue(summarySnapshot?.pricing?.expectation ?? page2.expectation)
      ? { label: "Expectativa principal", value: summarySnapshot?.pricing?.expectation ?? page2.expectation }
      : null,
    summarySnapshot?.appointment?.startAt || appointment
      ? {
          label: "Treinamento",
          value: summarySnapshot?.appointment?.startAt
            ? `${dayjs(summarySnapshot.appointment.startAt).format("DD/MM/YYYY HH:mm")} até ${dayjs(summarySnapshot.appointment.endAt).format("HH:mm")}`
            : `${dayjs(appointment.startAt).format("DD/MM/YYYY HH:mm")} até ${dayjs(appointment.endAt).format("HH:mm")}`,
        }
      : null,
    latestAcceptance?.acceptedAt
      ? { label: "Aceite registrado", value: `${dayjs(latestAcceptance.acceptedAt).format("DD/MM/YYYY HH:mm")} por ${latestAcceptance.acceptedByUser?.name ?? "usuário responsável"}` }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const emailRows = [
    hasValue(joinValues(emailStep.providerOptions)) ? { label: "Provedores", value: joinValues(emailStep.providerOptions)! } : null,
    hasValue([emailStep.tiContactName, emailStep.tiContactPhone].filter(Boolean).join(" • "))
      ? { label: "Contato do TI", value: [emailStep.tiContactName, emailStep.tiContactPhone].filter(Boolean).join(" • ") }
      : null,
    ...emailUsers
      .filter((user: any) => user?.name || user?.email)
      .map((user: any, index: number) => ({
        label: `Usuário ${index + 1}`,
        value: [[user?.name, user?.email].filter(Boolean).join(" • "), user?.roleOrFunction ? `Função: ${user.roleOrFunction}` : ""].filter(Boolean).join(" | "),
      })),
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const systemsRows = [
    hasValue(joinValues(systems.erpContabil?.values)) ? { label: "ERP contábil", value: joinValues(systems.erpContabil?.values)! } : null,
    hasValue(page1.erpEnvironment)
      ? {
          label: "Ambiente do ERP",
          value:
            {
              WEB_CLOUD: "Web/Cloud",
              SERVIDOR_PROPRIO: "Servidor próprio",
              SERVIDOR_REMOTO: "Servidor remoto",
            }[page1.erpEnvironment as "WEB_CLOUD" | "SERVIDOR_PROPRIO" | "SERVIDOR_REMOTO"],
        }
      : null,
    hasValue(joinValues(systems.cnd?.values)) ? { label: "CND", value: joinValues(systems.cnd?.values)! } : null,
    hasValue(joinValues(systems.capturaArmazenamento?.values)) ? { label: "Captura/armazenamento", value: joinValues(systems.capturaArmazenamento?.values)! } : null,
    hasValue(joinValues(systems.gestaoProcessos?.values)) ? { label: "Gestão de processos", value: joinValues(systems.gestaoProcessos?.values)! } : null,
    hasValue(joinValues(systems.bi?.values)) ? { label: "BI", value: joinValues(systems.bi?.values)! } : null,
    hasValue(joinValues(systems.auditoriaConsultoriaAutomacao?.values)) ? { label: "Auditoria/automações", value: joinValues(systems.auditoriaConsultoriaAutomacao?.values)! } : null,
    hasValue(joinValues(systems.conciliacaoContabil?.values)) ? { label: "Conciliação", value: joinValues(systems.conciliacaoContabil?.values)! } : null,
    hasValue(joinValues(systems.financeiroBpo?.values)) ? { label: "Financeiro/BPO", value: joinValues(systems.financeiroBpo?.values)! } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const pricingRows = [
    hasValue(joinValues(page2.pricingFactors)) ? { label: "Critérios de precificação", value: joinValues(page2.pricingFactors)! } : null,
    hasValue(page2.expectation) ? { label: "Expectativa", value: page2.expectation } : null,
    hasValue(joinValues(page2.honorariumHighlights)) ? { label: "Destaques do Honorarium", value: joinValues(page2.honorariumHighlights)! } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;
  const fileChoiceRows = [
    proposal
      ? { label: "Proposta comercial", value: `Modelo próprio enviado: ${proposal.filename}` }
      : uploadsState?.noProposalTemplate && uploadsState?.selectedProposalTemplateId
        ? { label: "Proposta comercial", value: `Modelo Honorarium escolhido: ${uploadsState.selectedProposalTemplateName ?? selectedProposalModel?.name ?? "Modelo selecionado"}` }
        : null,
    contract
      ? { label: "Contrato", value: `Modelo próprio enviado: ${contract.filename}` }
      : uploadsState?.contractAcknowledged
        ? { label: "Contrato", value: "Contrato padrão Honorarium confirmado" }
        : null,
    uploadsState?.contractStandardViewedAt
      ? { label: "Contrato padrão visualizado", value: dayjs(uploadsState.contractStandardViewedAt).format("DD/MM/YYYY HH:mm") }
      : null,
    uploadsState?.contractStandardDownloadedAt
      ? { label: "Contrato padrão baixado", value: dayjs(uploadsState.contractStandardDownloadedAt).format("DD/MM/YYYY HH:mm") }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  return (
    <AppShell title="Admin • Detalhe do formulário">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Formulário
          </Typography>
          <Typography color="text.secondary">
            {[form.user?.name, form.user?.email, form.updatedAt ? `Atualizado em ${dayjs(form.updatedAt).format("DD/MM/YYYY HH:mm")}` : null].filter(Boolean).join(" • ")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip label={form.status} />
          <Button variant="outlined" component="a" href={`${API_URL}/api/admin/forms.csv`} target="_blank" rel="noreferrer">
            Exportar CSV
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        <Card>
          <CardContent sx={{ pb: 1 }}>
            <Tabs value={activeTab} onChange={(_, value) => setActiveTab(value)} variant="scrollable" scrollButtons="auto">
              <Tab value="overview" label="Visão geral" />
              <Tab value="simulation" label="Simulação de honorários" />
            </Tabs>
          </CardContent>
        </Card>

        {activeTab === "overview" ? (
          <>
            <DetailSection title="Dados gerais do cliente" rows={clientRows} />

            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 900 }}>Status da trilha</Typography>
                <Divider sx={{ my: 1.5 }} />
                <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                  <Chip label={`Etapa 01 • ${stageStatusLabel(stageStatuses.stage1)}`} color={stageStatuses.stage1 === "CONCLUIDA" ? "success" : "default"} />
                  <Chip label={`Etapa 02 • ${stageStatusLabel(stageStatuses.stage2)}`} color={stageStatuses.stage2 === "CONCLUIDA" || stageStatuses.stage2 === "PROXIMA_ETAPA_DISPONIVEL" ? "success" : "default"} />
                  <Chip label={`Etapa 03 • ${stageStatusLabel(stageStatuses.stage3)}`} color={stageStatuses.stage3 === "CONCLUIDA" || stageStatuses.stage3 === "PROXIMA_ETAPA_DISPONIVEL" ? "success" : "default"} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      releaseMutation.mutate({
                        ...(form?.stepData?.stageAccess ?? {}),
                        stage2Released: !stageStatuses.stage02Released,
                      })
                    }
                  >
                    {stageStatuses.stage02Released ? "Reabrir Etapa 01" : "Liberar Etapa 02"}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() =>
                      releaseMutation.mutate({
                        ...(form?.stepData?.stageAccess ?? {}),
                        stage3Released: !stageStatuses.stage03Released,
                      })
                    }
                  >
                    {stageStatuses.stage03Released ? "Reabrir Etapa 02" : "Liberar Etapa 03"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <DetailSection title="Resumo da implantação" rows={summaryRows} />
            <AdminScheduleCalendarCard formId={form.id} appointment={appointment} refresh={refresh} />
            <DetailSection title="E-mail e usuários" rows={emailRows} />
            <DetailSection title="Soluções utilizadas" rows={systemsRows} />
            <DetailSection title="Critérios e expectativa" rows={pricingRows} />
            <DetailSection title="Modelos escolhidos" rows={fileChoiceRows} />

            <UploadAdminCard formId={form.id} type="PROPOSTA" title="Arquivo • Proposta comercial" upload={proposal} logs={fileLogs.filter((log: FileLog) => log.type === "PROPOSTA")} refresh={refresh} />
            <UploadAdminCard formId={form.id} type="CONTRATO" title="Arquivo • Contrato" upload={contract} logs={fileLogs.filter((log: FileLog) => log.type === "CONTRATO")} refresh={refresh} />
            <UploadAdminCard formId={form.id} type="RELACAO_CLIENTES" title="Arquivo • Relação de clientes" upload={clientList} logs={fileLogs.filter((log: FileLog) => log.type === "RELACAO_CLIENTES")} refresh={refresh} />

            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 900 }}>Histórico de autosave</Typography>
                <Divider sx={{ my: 1.5 }} />
                {history.length ? (
                  <Stack spacing={0.8}>
                    {history.map((item: any) => (
                      <Typography key={item.id} color="text.secondary">
                        Step {item.stepIndex} • {dayjs(item.savedAt).format("DD/MM/YYYY HH:mm:ss")}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">Nenhum autosave registrado.</Typography>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography sx={{ fontWeight: 900 }}>Logs operacionais</Typography>
                <Divider sx={{ my: 1.5 }} />
                <OperationalLogPanel logs={implementationLogs} />
              </CardContent>
            </Card>
          </>
        ) : null}

        {activeTab === "simulation" ? <AdminHonorariosSimulationTab /> : null}
      </Stack>
    </AppShell>
  );
}


