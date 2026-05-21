import React from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { getHonorariumProposalModelById } from "../domain/templates/honorariumTemplates";
import { api } from "../lib/api";
import dayjs from "../lib/dayjs";
import type { OnboardingForm } from "../types";

function hasValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return value !== null && value !== undefined && value !== false;
}

function joinValues(items?: string[]) {
  if (!items?.length) return null;
  return items.map((item) => (item === "OUTRO" ? "Outro" : item)).join(", ");
}

function environmentLabel(value?: string) {
  return {
    WEB_CLOUD: "Web/Cloud",
    SERVIDOR_PROPRIO: "Servidor próprio",
    SERVIDOR_REMOTO: "Servidor remoto",
  }[value ?? ""] ?? null;
}

function findUpload(form: OnboardingForm | undefined, type: "PROPOSTA" | "CONTRATO" | "RELACAO_CLIENTES") {
  return (form?.uploads ?? []).find((upload) => upload.type === type && upload.status !== "EXCLUIDO_ADMIN") ?? null;
}

function SummarySection({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: React.ReactNode }>;
}) {
  if (!rows.length) return null;

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(15,23,42,0.1)" }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5 }}>
          {title}
        </Typography>
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

export function FormSummaryPage() {
  const { formId } = useParams();

  const query = useQuery({
    queryKey: ["form-summary", formId],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
    staleTime: 30_000,
  });

  const form = query.data;
  const office = form?.stepData?.office ?? {};
  const page1 = form?.stepData?.page1 ?? {};
  const page2 = form?.stepData?.page2 ?? {};
  const email = form?.stepData?.email ?? {};
  const uploadsState = form?.stepData?.uploads ?? {};
  const stage01Completion = form?.stepData?.stage01Completion ?? {};
  const proposal = findUpload(form, "PROPOSTA");
  const contract = findUpload(form, "CONTRATO");
  const clientList = findUpload(form, "RELACAO_CLIENTES");
  const latestAcceptance = form?.stageAcceptances?.find((item) => item.stageKey === "ETAPA_01") ?? null;
  const selectedProposalModel = getHonorariumProposalModelById(uploadsState.selectedProposalTemplateId);

  const officeRows = [
    hasValue(office.officeName) ? { label: "Escritório", value: office.officeName } : null,
    hasValue(office.cityUf) ? { label: "Cidade/UF", value: office.cityUf } : null,
    hasValue(office.activeCompanies) ? { label: "Empresas ativas", value: office.activeCompanies } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const contactRows = [
    hasValue(office.responsibleName ?? form?.user?.name) ? { label: "Nome", value: office.responsibleName ?? form?.user?.name } : null,
    hasValue(office.email ?? form?.user?.email) ? { label: "E-mail", value: office.email ?? form?.user?.email } : null,
    hasValue(office.whatsapp) ? { label: "WhatsApp", value: office.whatsapp } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const operationRows = [
    hasValue(joinValues(page1.systems?.erpContabil?.values)) ? { label: "ERP selecionado", value: joinValues(page1.systems?.erpContabil?.values)! } : null,
    hasValue(page1.systems?.erpContabil?.otherText) ? { label: "ERP informado manualmente", value: page1.systems.erpContabil.otherText } : null,
    hasValue(environmentLabel(page1.erpEnvironment)) ? { label: "Ambiente do ERP", value: environmentLabel(page1.erpEnvironment)! } : null,
    hasValue(joinValues(page2.pricingFactors)) ? { label: "Critérios de precificação", value: joinValues(page2.pricingFactors)! } : null,
    hasValue(page2.expectation) ? { label: "Expectativa principal", value: page2.expectation } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const filesRows = [
    proposal
      ? { label: "Proposta comercial", value: `Modelo próprio enviado: ${proposal.filename}` }
      : uploadsState.noProposalTemplate && uploadsState.selectedProposalTemplateId
        ? { label: "Proposta comercial", value: `Modelo Honorarium escolhido: ${uploadsState.selectedProposalTemplateName ?? selectedProposalModel?.name ?? "Modelo selecionado"}` }
        : null,
    contract
      ? { label: "Contrato", value: `Modelo próprio enviado: ${contract.filename}` }
      : uploadsState.contractAcknowledged
        ? { label: "Contrato", value: "Contrato padrão Honorarium confirmado" }
        : null,
    clientList ? { label: "Relação de clientes", value: `Planilha enviada: ${clientList.filename}` } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const userCount = (email.users ?? []).filter((item: any) => item?.name || item?.email);
  const userList = userCount
    .map((item: any) =>
      [
        [item.name, item.email].filter(Boolean).join(" • "),
        item.roleOrFunction ? `Função: ${item.roleOrFunction}` : "",
        item.attendsTraining ? "Participa do treinamento" : "",
        item.isEnvironmentAdmin ? "Administrador do ambiente" : "",
      ]
        .filter(Boolean)
        .join(" | ")
    )
    .filter(Boolean)
    .join(" | ");

  const setupRows = [
    hasValue(joinValues(email.providerOptions)) ? { label: "Provedor de e-mail", value: joinValues(email.providerOptions)! } : null,
    hasValue([email.tiContactName, email.tiContactPhone].filter(Boolean).join(" • ")) ? { label: "Responsável de TI", value: [email.tiContactName, email.tiContactPhone].filter(Boolean).join(" • ") } : null,
    userCount.length ? { label: "Usuários informados", value: String(userCount.length) } : null,
    hasValue(userList) ? { label: "Lista de usuários", value: userList } : null,
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const trainingRows = [
    form?.appointment
      ? {
          label: "Data e horário do treinamento",
          value: `${dayjs(form.appointment.startAt).format("DD/MM/YYYY [às] HH:mm")} até ${dayjs(form.appointment.endAt).format("HH:mm")}`,
        }
      : null,
    form?.appointment
      ? {
          label: "Status do treinamento",
          value:
            {
              NAO_DISPONIVEL: "Não disponível",
              DISPONIVEL_AGENDAMENTO: "Disponível para agendamento",
              RESERVADO: "Reservado",
              CONFIRMADO_EQUIPE: "Confirmado pela equipe",
              REAGENDADO: "Reagendado",
              REALIZADO: "Realizado",
              CANCELADO: "Cancelado",
            }[form.appointment.status] ?? form.appointment.status,
        }
      : null,
    {
      label: "Suporte Honorarium",
      value: (
        <Button component={RouterLink} to="/ajuda" variant="text" sx={{ p: 0, minWidth: "auto", textTransform: "none" }}>
          Central de ajuda e suporte Honorarium
        </Button>
      ),
    },
  ].filter(Boolean) as Array<{ label: string; value: React.ReactNode }>;

  const sections = [
    { title: "Dados do escritório", rows: officeRows },
    { title: "Responsável pelo preenchimento", rows: contactRows },
    { title: "Estrutura operacional", rows: operationRows },
    { title: "Arquivos e confirmações", rows: filesRows },
    { title: "Usuários e preparação", rows: setupRows },
    { title: "Treinamento e suporte", rows: trainingRows },
  ].filter((section) => section.rows.length > 0);

  return (
    <AppShell title="Resumo da implantação" formId={formId}>
      <Stack spacing={3}>
        <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5 }}>
                  Resumo da implantação
                </Typography>
                <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
                  Confira apenas as definições já registradas para a etapa inicial.
                </Typography>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                <Chip sx={{ maxWidth: "100%" }} icon={<DescriptionOutlinedIcon />} label="TAP • controle interno" variant="outlined" />
                <Chip
                  icon={<CheckCircleOutlineRoundedIcon />}
                  label={latestAcceptance ? "Etapa 01 concluída" : "Etapa 01 em andamento"}
                  color={latestAcceptance ? "success" : "default"}
                  sx={{ maxWidth: "100%" }}
                />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
          {sections.map((section) => (
            <SummarySection key={section.title} title={section.title} rows={section.rows} />
          ))}
        </Box>

        {latestAcceptance ? (
          <Alert severity="success" icon={<CheckCircleOutlineRoundedIcon />}>
            <Stack spacing={0.6}>
              <Typography sx={{ fontWeight: 700 }}>A conclusão da Etapa 01 já foi registrada.</Typography>
              <Typography>
                Confirmação em {dayjs(latestAcceptance.acceptedAt).format("DD/MM/YYYY [às] HH:mm")} por {latestAcceptance.acceptedByUser?.name ?? "usuário responsável"}.
              </Typography>
              <Typography>A próxima etapa permanece dependente de liberação administrativa.</Typography>
            </Stack>
          </Alert>
        ) : null}

        {latestAcceptance ? (
          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>
                Registro da conclusão
              </Typography>
              <Stack spacing={0.9}>
                {hasValue(stage01Completion.status ?? latestAcceptance.status) ? (
                  <Typography color="text.secondary">
                    <strong>Status da etapa:</strong> {stage01Completion.status ?? latestAcceptance.status}
                  </Typography>
                ) : null}
                <Typography color="text.secondary">
                  <strong>Data e hora:</strong> {dayjs(latestAcceptance.acceptedAt).format("DD/MM/YYYY [às] HH:mm")}
                </Typography>
                {latestAcceptance.acceptedByUser?.name ? (
                  <Typography color="text.secondary">
                    <strong>Responsável:</strong> {latestAcceptance.acceptedByUser.name}
                  </Typography>
                ) : null}
                <Typography color="text.secondary">
                  <strong>Versão registrada:</strong> {latestAcceptance.version}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  );
}
