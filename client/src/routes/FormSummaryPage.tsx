import React from "react";
import { AppShell } from "../components/AppShell";
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, API_URL } from "../lib/api";
import { jsPDF } from "jspdf";
import type { OnboardingForm } from "../types";
import dayjs from "../lib/dayjs";

function joinOrDash(list?: string[]) {
  return list && list.length ? list.join(", ") : "—";
}

export function FormSummaryPage() {
  const { formId } = useParams();

  const q = useQuery({
    queryKey: ["form", formId],
    enabled: Boolean(formId),
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data as { form: OnboardingForm },
  });

  const form = q.data?.form;
  const page1 = form?.stepData?.page1 ?? {};
  const systems = page1.systems ?? {};
  const systemsComment: string = page1.systemsComment ?? "";

  const page2 = form?.stepData?.page2 ?? {};
  const services: string[] = page2.servicesOffered ?? page1.servicesOffered ?? [];
  const factors: string[] = page2.pricingFactors ?? [];
  const motivation: string = page2.motivation ?? "";

  const uploadNotes: any = form?.stepData?.uploads ?? {};

  const uploads = form?.uploads ?? [];
  const contract = uploads.find((u) => u.type === "CONTRATO");
  const proposal = uploads.find((u) => u.type === "PROPOSTA");

  function downloadPdf() {
    if (!form) return;
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text("Resumo • Sistemas & Precificação", 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 14, 22);

    let y = 30;

    function section(name: string) {
      doc.setFontSize(12);
      doc.text(name, 14, y);
      y += 6;
      doc.setFontSize(10);
    }

    function line(label: string, value: string) {
      const text = `${label}: ${value}`;
      const lines = doc.splitTextToSize(text, 180);
      doc.text(lines, 14, y);
      y += 5 * lines.length;
      if (y > 280) {
        doc.addPage();
        y = 16;
      }
    }

    section("Soluções utilizadas");
    line("ERP Contábil", joinOrDash(systems.erpContabil?.values));
    if ((systems.erpContabil?.values ?? []).includes("OUTRO") && systems.erpContabil?.otherText) {
      line("ERP • Outro", String(systems.erpContabil.otherText));
    }
    line("Captura/Armazenamento", joinOrDash(systems.capturaArmazenamento?.values));
    if ((systems.capturaArmazenamento?.values ?? []).includes("OUTRO") && systems.capturaArmazenamento?.otherText) {
      line("Captura • Outro", String(systems.capturaArmazenamento.otherText));
    }
    line("Processos/Acessórias", joinOrDash(systems.gestaoProcessos?.values));
    if ((systems.gestaoProcessos?.values ?? []).includes("OUTRO") && systems.gestaoProcessos?.otherText) {
      line("Processos • Outro", String(systems.gestaoProcessos.otherText));
    }
    line("BI", joinOrDash(systems.bi?.values));
    if ((systems.bi?.values ?? []).includes("OUTRO") && systems.bi?.otherText) {
      line("BI • Outro", String(systems.bi.otherText));
    }
    line("CND", joinOrDash(systems.cnd?.values));
    if ((systems.cnd?.values ?? []).includes("OUTRO") && systems.cnd?.otherText) {
      line("CND • Outro", String(systems.cnd.otherText));
    }
    line("Auditoria/Automação", joinOrDash(systems.auditoriaConsultoriaAutomacao?.values));
    if ((systems.auditoriaConsultoriaAutomacao?.values ?? []).includes("OUTRO") && systems.auditoriaConsultoriaAutomacao?.otherText) {
      line("Auditoria • Outro", String(systems.auditoriaConsultoriaAutomacao.otherText));
    }
    line("Conciliação", joinOrDash(systems.conciliacaoContabil?.values));
    if ((systems.conciliacaoContabil?.values ?? []).includes("OUTRO") && systems.conciliacaoContabil?.otherText) {
      line("Conciliação • Outro", String(systems.conciliacaoContabil.otherText));
    }
    line("Financeiro/BPO", joinOrDash(systems.financeiroBpo?.values));
    if ((systems.financeiroBpo?.values ?? []).includes("OUTRO") && systems.financeiroBpo?.otherText) {
      line("Financeiro • Outro", String(systems.financeiroBpo.otherText));
    }

    if (systemsComment?.trim()) {
      y += 2;
      section("Comentários");
      line("Observações", systemsComment);
    }

    y += 2;
    section("Serviços ofertados");
    line("Serviços", joinOrDash(services));

    y += 2;
    section("Fatores de precificação");
    line("Fatores", joinOrDash(factors));

    y += 2;
    section("Motivação e expectativa");
    line("Resposta", motivation?.trim() ? motivation : "—");

    y += 2;
    section("Anexos");
    line("Contrato", contract ? contract.filename : uploadNotes?.noContractTemplate ? "Não possuo template" : "—");
    line("Proposta", proposal ? proposal.filename : uploadNotes?.noProposalTemplate ? "Não possuo template" : "—");

    doc.save(`resumo-${form.id}.pdf`);
  }

  if (q.isLoading) {
    return (
      <AppShell title="Resumo">
        <Typography>Carregando...</Typography>
      </AppShell>
    );
  }

  if (!form) {
    return (
      <AppShell title="Resumo">
        <Typography>Formulário não encontrado.</Typography>
      </AppShell>
    );
  }

  return (
    <AppShell title="Resumo">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Resumo
          </Typography>
          <Typography color="text.secondary">
            Status: <strong>{form.status}</strong> • Atualizado em {dayjs(form.updatedAt).format("DD/MM/YYYY HH:mm")}
          </Typography>
        </Box>

        <Button variant="outlined" onClick={downloadPdf}>
          Baixar resumo em PDF
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Soluções utilizadas</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary">
              <strong>ERP Contábil:</strong> {joinOrDash(systems.erpContabil?.values)}
            </Typography>
            {(systems.erpContabil?.values ?? []).includes("OUTRO") && systems.erpContabil?.otherText ? (
              <Typography color="text.secondary">
                <strong>ERP • Outro:</strong> {systems.erpContabil.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>Captura/Armazenamento:</strong> {joinOrDash(systems.capturaArmazenamento?.values)}
            </Typography>
            {(systems.capturaArmazenamento?.values ?? []).includes("OUTRO") && systems.capturaArmazenamento?.otherText ? (
              <Typography color="text.secondary">
                <strong>Captura • Outro:</strong> {systems.capturaArmazenamento.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>Processos/Acessórias:</strong> {joinOrDash(systems.gestaoProcessos?.values)}
            </Typography>
            {(systems.gestaoProcessos?.values ?? []).includes("OUTRO") && systems.gestaoProcessos?.otherText ? (
              <Typography color="text.secondary">
                <strong>Processos • Outro:</strong> {systems.gestaoProcessos.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>BI:</strong> {joinOrDash(systems.bi?.values)}
            </Typography>
            {(systems.bi?.values ?? []).includes("OUTRO") && systems.bi?.otherText ? (
              <Typography color="text.secondary">
                <strong>BI • Outro:</strong> {systems.bi.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>CND:</strong> {joinOrDash(systems.cnd?.values)}
            </Typography>
            {(systems.cnd?.values ?? []).includes("OUTRO") && systems.cnd?.otherText ? (
              <Typography color="text.secondary">
                <strong>CND • Outro:</strong> {systems.cnd.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>Auditoria/Automação:</strong> {joinOrDash(systems.auditoriaConsultoriaAutomacao?.values)}
            </Typography>
            {(systems.auditoriaConsultoriaAutomacao?.values ?? []).includes("OUTRO") && systems.auditoriaConsultoriaAutomacao?.otherText ? (
              <Typography color="text.secondary">
                <strong>Auditoria • Outro:</strong> {systems.auditoriaConsultoriaAutomacao.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>Conciliação:</strong> {joinOrDash(systems.conciliacaoContabil?.values)}
            </Typography>
            {(systems.conciliacaoContabil?.values ?? []).includes("OUTRO") && systems.conciliacaoContabil?.otherText ? (
              <Typography color="text.secondary">
                <strong>Conciliação • Outro:</strong> {systems.conciliacaoContabil.otherText}
              </Typography>
            ) : null}

            <Typography color="text.secondary">
              <strong>Financeiro/BPO:</strong> {joinOrDash(systems.financeiroBpo?.values)}
            </Typography>
            {(systems.financeiroBpo?.values ?? []).includes("OUTRO") && systems.financeiroBpo?.otherText ? (
              <Typography color="text.secondary">
                <strong>Financeiro • Outro:</strong> {systems.financeiroBpo.otherText}
              </Typography>
            ) : null}

            {systemsComment?.trim() ? (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 900 }}>Comentários</Typography>
                <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {systemsComment}
                </Typography>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Serviços ofertados</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary">{joinOrDash(services)}</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Fatores para precificar</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary">{joinOrDash(factors)}</Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Motivação e expectativa</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
              {motivation?.trim() ? motivation : "—"}
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Anexos</Typography>
            <Divider sx={{ my: 1.5 }} />
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
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
