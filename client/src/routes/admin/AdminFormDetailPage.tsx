import React from "react";
import { AppShell } from "../../components/AppShell";
import { Box, Button, Card, CardContent, Divider, Stack, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, API_URL } from "../../lib/api";
import type { OnboardingForm } from "../../types";
import dayjs from "../../lib/dayjs";

function joinOrDash(list?: string[]) {
  return list && list.length ? list.join(", ") : "—";
}

export function AdminFormDetailPage() {
  const { formId } = useParams();

  const q = useQuery({
    queryKey: ["adminForm", formId],
    enabled: Boolean(formId),
    queryFn: async () => (await api.get(`/api/admin/forms/${formId}`)).data as { form: OnboardingForm & { user: any } },
  });

  const form = q.data?.form as any;

  const emailStep = form?.stepData?.email ?? {};
  const emailProvider: string = emailStep.emailProvider ?? "";
  const emailUsers: Array<{ name?: string; email?: string }> = Array.isArray(emailStep.users) ? emailStep.users : [];

  const page1 = form?.stepData?.page1 ?? {};
  const systems = page1.systems ?? {};
  const systemsComment: string = page1.systemsComment ?? "";

  const page2 = form?.stepData?.page2 ?? {};
  const services: string[] = page2.servicesOffered ?? page1.servicesOffered ?? [];
  const servicesComment: string = page2.servicesComment ?? "";
  const factors: string[] = page2.pricingFactors ?? [];
  const pricingFactorsComment: string = page2.pricingFactorsComment ?? "";
  const motivation: string = page2.motivation ?? "";

  const uploadNotes: any = form?.stepData?.uploads ?? {};

  const uploads = Array.isArray(form?.uploads) ? form.uploads : [];
  const history = Array.isArray(form?.history) ? form.history : [];

  const contract = uploads.find((u: any) => u?.type === "CONTRATO");
  const proposal = uploads.find((u: any) => u?.type === "PROPOSTA");

  async function downloadUpload(uploadId: string, filename: string) {
    const response = await api.get(`/api/uploads/download/${uploadId}`, {
      responseType: "blob",
    });

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

  if (q.isLoading) {
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

  return (
    <AppShell title="Admin • Detalhe do formulário">
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Formulário
          </Typography>
          <Typography color="text.secondary">
            {form.user?.name} • {form.user?.email} • Atualizado em {form.updatedAt ? dayjs(form.updatedAt).format("DD/MM/YYYY HH:mm") : "—"}
          </Typography>
        </Box>
        <Button variant="outlined" component="a" href={`${API_URL}/api/admin/forms.csv`} target="_blank" rel="noreferrer">
          Exportar CSV
        </Button>
      </Stack>

      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>E-mail e usuários</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary">
              <strong>Provedor:</strong> {emailProvider ? emailProvider : "—"}
            </Typography>
            <Box sx={{ mt: 1.25, display: "grid", gap: 0.5 }}>
              {emailUsers.filter((u) => (u?.name ?? "").trim() || (u?.email ?? "").trim()).length ? (
                emailUsers
                  .filter((u) => (u?.name ?? "").trim() || (u?.email ?? "").trim())
                  .map((u, i) => (
                    <Typography key={i} color="text.secondary">
                      <strong>Usuário {i + 1}:</strong> {u?.name || "—"} • {u?.email || "—"}
                    </Typography>
                  ))
              ) : (
                <Typography color="text.secondary">—</Typography>
              )}
            </Box>
          </CardContent>
        </Card>

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
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Comentários</Typography>
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

            {servicesComment?.trim() ? (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Comentários</Typography>
                <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {servicesComment}
                </Typography>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Fatores para precificar</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography color="text.secondary">{joinOrDash(factors)}</Typography>

            {pricingFactorsComment?.trim() ? (
              <>
                <Divider sx={{ my: 1.5 }} />
                <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Comentários</Typography>
                <Typography color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {pricingFactorsComment}
                </Typography>
              </>
            ) : null}
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
            <Stack spacing={1}>
              <Typography color="text.secondary">
                <strong>Contrato:</strong>{" "}
                {contract ? (
                  <Button
                    variant="text"
                    onClick={() => downloadUpload(contract.id, contract.filename)}
                    sx={{ p: 0, minWidth: "auto", textTransform: "none" }}
                  >
                    {contract.filename}
                  </Button>
                ) : uploadNotes?.noContractTemplate ? (
                  "Não possuo template."
                ) : (
                  "—"
                )}
              </Typography>
              <Typography color="text.secondary">
                <strong>Proposta:</strong>{" "}
                {proposal ? (
                  <Button
                    variant="text"
                    onClick={() => downloadUpload(proposal.id, proposal.filename)}
                    sx={{ p: 0, minWidth: "auto", textTransform: "none" }}
                  >
                    {proposal.filename}
                  </Button>
                ) : uploadNotes?.noProposalTemplate ? (
                  "Não possuo template."
                ) : (
                  "—"
                )}
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Histórico (autosave)</Typography>
            <Divider sx={{ my: 1.5 }} />
            {history.length ? (
              <Stack spacing={0.8}>
                {history.map((h: any) => (
                  <Typography key={h.id} color="text.secondary">
                    Step {h.stepIndex} • {dayjs(h.savedAt).format("DD/MM/YYYY HH:mm:ss")}
                  </Typography>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">Sem histórico.</Typography>
            )}
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
