import React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";
import type { OnboardingForm } from "../types";

function joinOrDash(items?: string[]) {
  return items && items.length ? items.map((i) => (i === "OUTRO" ? "Outro" : i)).join(", ") : "—";
}

export function FormSummaryPage() {
  const { formId } = useParams();

  const q = useQuery({
    queryKey: ["form-summary", formId],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = q.data;
  const systems = form?.stepData?.page1?.systems ?? {};
  const page1 = form?.stepData?.page1 ?? {};
  const page2 = form?.stepData?.page2 ?? {};
  const email = form?.stepData?.email ?? {};
  const uploads = form?.stepData?.uploads ?? {};

  return (
    <AppShell title="Resumo da jornada">
      <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
            Formulário enviado com sucesso
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Abaixo está um resumo das informações preenchidas na jornada de implantação.
          </Typography>

          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>Sistemas</Typography>
          <Typography color="text.secondary"><strong>ERP Contábil:</strong> {joinOrDash(systems.erpContabil?.values)}</Typography>
          <Typography color="text.secondary"><strong>CND:</strong> {joinOrDash(systems.cnd?.values)}</Typography>
          <Typography color="text.secondary"><strong>Captura e armazenamento:</strong> {joinOrDash(systems.capturaArmazenamento?.values)}</Typography>
          <Typography color="text.secondary"><strong>Conciliação contábil:</strong> {joinOrDash(systems.conciliacaoContabil?.values)}</Typography>
          <Typography color="text.secondary"><strong>Gestão de processos:</strong> {joinOrDash(systems.gestaoProcessos?.values)}</Typography>
          <Typography color="text.secondary"><strong>BI:</strong> {joinOrDash(systems.bi?.values)}</Typography>
          <Typography color="text.secondary"><strong>Auditoria, Consultoria e Automação:</strong> {joinOrDash(systems.auditoriaConsultoriaAutomacao?.values)}</Typography>
          <Typography color="text.secondary"><strong>Financeiro / BPO financeiro:</strong> {joinOrDash(systems.financeiroBpo?.values)}</Typography>
          {page1.systemsComment ? <Typography color="text.secondary" sx={{ mt: 1 }}><strong>Comentários:</strong> {page1.systemsComment}</Typography> : null}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>Fatores e expectativa</Typography>
          <Typography color="text.secondary"><strong>Fatores considerados:</strong> {joinOrDash(page2.pricingFactors)}</Typography>
          {page2.pricingFactorsComment ? <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>Comentários:</strong> {page2.pricingFactorsComment}</Typography> : null}
          <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>O que te encantou no Honorarium:</strong> {joinOrDash(page2.honorariumHighlights)}</Typography>
          {page2.expectation ? <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>Expectativa:</strong> {page2.expectation}</Typography> : null}

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>E-mails, usuários e uploads</Typography>
          <Typography color="text.secondary"><strong>Provedores:</strong> {joinOrDash(email.providerOptions)}</Typography>
          {email.providerOtherText ? <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>Outro provedor:</strong> {email.providerOtherText}</Typography> : null}
          {(email.tiContactName || email.tiContactPhone) ? <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>Contato do TI:</strong> {[email.tiContactName, email.tiContactPhone].filter(Boolean).join(" • ")}</Typography> : null}

          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ fontWeight: 800, mb: 0.75 }}>Usuários</Typography>
            <Stack direction="row" gap={1} flexWrap="wrap">
              {(email.users ?? []).filter((u: any) => u?.name || u?.email).length ? (
                (email.users ?? []).filter((u: any) => u?.name || u?.email).map((u: any, index: number) => (
                  <Chip key={`${u.email}-${index}`} label={[u.name, u.email].filter(Boolean).join(" • ")} />
                ))
              ) : (
                <Chip label="Não informado" variant="outlined" />
              )}
            </Stack>
          </Box>

          {uploads.contractNotes ? <Typography color="text.secondary" sx={{ mt: 1.25 }}><strong>Observações do contrato:</strong> {uploads.contractNotes}</Typography> : null}
          {uploads.proposalNotes ? <Typography color="text.secondary" sx={{ mt: 0.75 }}><strong>Observações da proposta:</strong> {uploads.proposalNotes}</Typography> : null}

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button component={RouterLink} to="/" variant="outlined">Voltar ao início</Button>
          </Stack>
        </CardContent>
      </Card>
    </AppShell>
  );
}
