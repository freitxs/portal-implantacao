import React from "react";
import { Box, Button, Card, CardContent, Chip, Divider, Stack, Typography } from "@mui/material";
import type { OnboardingForm } from "../../../types";
import { API_URL } from "../../../lib/api";

function joinOrDash(list?: string[]) {
  return list && list.length ? list.join(", ") : "—";
}

function renderCategory(title: string, values: string[], otherText?: string) {
  const normalized = (values ?? []).map((v) => (v === "OUTRO" ? "Outro" : v));
  const chips = normalized.length ? normalized : [];
  return (
    <Box sx={{ border: "1px solid rgba(16,24,40,0.08)", borderRadius: 2.5, p: 2 }}>
      <Typography sx={{ fontWeight: 900, mb: 1 }}>{title}</Typography>
      {chips.length ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {chips.map((c) => (
            <Chip key={c} size="small" label={c} />
          ))}
        </Box>
      ) : (
        <Typography color="text.secondary">—</Typography>
      )}
      {values?.includes("OUTRO") && otherText ? (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          <strong>Outro:</strong> {otherText}
        </Typography>
      ) : null}
    </Box>
  );
}

export function StepReview({ form, onSubmit }: { form: OnboardingForm; onSubmit: () => void }) {
  const page1 = form.stepData?.page1 ?? {};
  const systems = page1.systems ?? {};
  const systemsComment: string = page1.systemsComment ?? "";

  const page2 = form.stepData?.page2 ?? {};
  const services: string[] = page2.servicesOffered ?? page1.servicesOffered ?? [];
  const factors: string[] = page2.pricingFactors ?? [];
  const motivation: string = page2.motivation ?? "";

  const uploadNotes: any = form.stepData?.uploads ?? {};

  const uploads = form.uploads ?? [];
  const contract = uploads.find((u) => u.type === "CONTRATO");
  const proposal = uploads.find((u) => u.type === "PROPOSTA");

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Revisão
          </Typography>
          <Typography color="text.secondary">Confira tudo antes de enviar. Você pode voltar e ajustar se quiser.</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontWeight: 900 }}>Soluções utilizadas</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1.5}>
            {renderCategory("ERP Contábil", systems.erpContabil?.values ?? [], systems.erpContabil?.otherText)}
            {renderCategory(
              "Captura e armazenamento de documentos fiscais eletrônicos",
              systems.capturaArmazenamento?.values ?? [],
              systems.capturaArmazenamento?.otherText
            )}
            {renderCategory(
              "Gestão de processos e obrigações acessórias",
              systems.gestaoProcessos?.values ?? [],
              systems.gestaoProcessos?.otherText
            )}
            {renderCategory("BI", systems.bi?.values ?? [], systems.bi?.otherText)}
            {renderCategory(
              "Controle de certidões negativas (CND) e regularidade",
              systems.cnd?.values ?? [],
              systems.cnd?.otherText
            )}
            {renderCategory(
              "Auditoria, Consultoria e Automação",
              systems.auditoriaConsultoriaAutomacao?.values ?? [],
              systems.auditoriaConsultoriaAutomacao?.otherText
            )}
            {renderCategory(
              "Conciliação Contábil",
              systems.conciliacaoContabil?.values ?? [],
              systems.conciliacaoContabil?.otherText
            )}
            {renderCategory(
              "Financeiro / BPO financeiro / ERP financeiro",
              systems.financeiroBpo?.values ?? [],
              systems.financeiroBpo?.otherText
            )}
          </Stack>

          {systemsComment?.trim() ? (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 1.5 }} />
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Comentários</Typography>
              <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                {systemsComment}
              </Typography>
            </Box>
          ) : null}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontWeight: 900 }}>Serviços ofertados</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography color="text.secondary">{joinOrDash(services)}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontWeight: 900 }}>Fatores para precificar</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography color="text.secondary">{joinOrDash(factors)}</Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontWeight: 900 }}>Motivação e expectativa</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {motivation?.trim() ? motivation : "—"}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography sx={{ fontWeight: 900 }}>Anexos</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            <Typography color="text.secondary">
              <strong>Contrato:</strong>{" "}
              {contract ? (
                <a href={`${API_URL}${contract.path}`} target="_blank" rel="noreferrer">
                  {contract.filename}
                </a>
              ) : uploadNotes?.noContractTemplate ? (
                "Não possuo template."
              ) : (
                "—"
              )}
            </Typography>
            <Typography color="text.secondary">
              <strong>Proposta:</strong>{" "}
              {proposal ? (
                <a href={`${API_URL}${proposal.path}`} target="_blank" rel="noreferrer">
                  {proposal.filename}
                </a>
              ) : uploadNotes?.noProposalTemplate ? (
                "Não possuo template."
              ) : (
                "—"
              )}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={onSubmit} disabled={form.status === "ENVIADO"}>
          Enviar
        </Button>
      </Box>
    </Stack>
  );
}
