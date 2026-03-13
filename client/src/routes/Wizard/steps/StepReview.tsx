import React from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import type { OnboardingForm } from "../../../types";

function renderCategory(label: string, values: string[], otherText?: string) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontWeight: 800, mb: 0.75 }}>{label}</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {values.length ? values.map((item) => <Chip key={item} label={item === "OUTRO" ? "Outro" : item} />) : <Chip label="Não informado" variant="outlined" />}
      </Stack>
      {values.includes("OUTRO") && otherText ? (
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Outro: {otherText}
        </Typography>
      ) : null}
    </Box>
  );
}

export function StepReview({ form, onSubmit }: { form: OnboardingForm; onSubmit: () => void }) {
  const data = form.stepData ?? {};
  const systems = data.page1?.systems ?? {};
  const factors = data.page2 ?? {};
  const email = data.email ?? {};
  const uploads = data.uploads ?? {};

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Revisão final
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Confira os dados antes de enviar. Se precisar, volte às etapas anteriores para ajustar qualquer informação.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>Sistemas</Typography>
        {renderCategory("ERP Contábil", systems.erpContabil?.values ?? [], systems.erpContabil?.otherText)}
        {renderCategory("Controle de certidões negativas (CND)", systems.cnd?.values ?? [], systems.cnd?.otherText)}
        {renderCategory("Captura e armazenamento", systems.capturaArmazenamento?.values ?? [], systems.capturaArmazenamento?.otherText)}
        {renderCategory("Conciliação contábil", systems.conciliacaoContabil?.values ?? [], systems.conciliacaoContabil?.otherText)}
        {renderCategory("Gestão de processos", systems.gestaoProcessos?.values ?? [], systems.gestaoProcessos?.otherText)}
        {renderCategory("BI", systems.bi?.values ?? [], systems.bi?.otherText)}
        {renderCategory("Auditoria, Consultoria e Automação", systems.auditoriaConsultoriaAutomacao?.values ?? [], systems.auditoriaConsultoriaAutomacao?.otherText)}
        {renderCategory("Financeiro / BPO financeiro", systems.financeiroBpo?.values ?? [], systems.financeiroBpo?.otherText)}

        {data.page1?.systemsComment ? (
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            <strong>Comentários:</strong> {data.page1.systemsComment}
          </Typography>
        ) : null}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>Fatores e expectativa</Typography>
        {renderCategory("Fatores de precificação", factors.pricingFactors ?? [], (factors as any).pricingFactorsOtherText)}
        {factors.pricingFactorsComment ? (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            <strong>Comentários sobre precificação:</strong> {factors.pricingFactorsComment}
          </Typography>
        ) : null}
        {renderCategory("O que te encantou no Honorarium", factors.honorariumHighlights ?? [])}
        {factors.expectation ? (
          <Typography color="text.secondary">
            <strong>Expectativa:</strong> {factors.expectation}
          </Typography>
        ) : null}

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>E-mails, usuários e uploads</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>Provedores:</strong> {(email.providerOptions ?? []).length ? email.providerOptions.join(", ") : "Não informado"}
        </Typography>
        {email.providerOtherText ? (
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Outro provedor:</strong> {email.providerOtherText}
          </Typography>
        ) : null}
        {email.tiContactName || email.tiContactPhone ? (
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            <strong>Contato do TI:</strong> {[email.tiContactName, email.tiContactPhone].filter(Boolean).join(" • ")}
          </Typography>
        ) : null}

        <Box sx={{ mb: 1.5 }}>
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

        {uploads.contractNotes ? (
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Observações do contrato:</strong> {uploads.contractNotes}
          </Typography>
        ) : null}
        {uploads.proposalNotes ? (
          <Typography color="text.secondary" sx={{ mb: 0.5 }}>
            <strong>Observações da proposta:</strong> {uploads.proposalNotes}
          </Typography>
        ) : null}

        <Divider sx={{ my: 3 }} />

        <Stack direction="row" justifyContent="flex-end">
          <Button variant="contained" color="secondary" onClick={onSubmit}>
            Confirmar e enviar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
