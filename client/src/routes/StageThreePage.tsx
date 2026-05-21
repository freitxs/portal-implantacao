import React from "react";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { useToast } from "../components/ToastProvider";
import { api } from "../lib/api";
import type { OnboardingForm, StageThreeIntegrationStatus } from "../types";
import { getStageAccess } from "./client/portalUtils";

const integrationStatuses: Record<StageThreeIntegrationStatus, string> = {
  AGUARDANDO_DADOS: "Aguardando dados",
  DADOS_ENVIADOS: "Dados enviados",
  EM_CONFIGURACAO: "Em configuração",
  AJUSTE_NECESSARIO: "Ajuste necessário",
  CONFIGURADA: "Configurada",
};

const baseIntegrations = [
  {
    id: "erp-api",
    name: "Integração com ERP",
    description: "Quando necessário, informe o acesso técnico ou a chave de API para que a equipe Honorarium conduza a integração com segurança.",
    placeholder: "Ex.: usuário de integração, chave de API ou referência técnica",
  },
  {
    id: "smtp",
    name: "Integração de e-mail",
    description: "A equipe Honorarium utilizará os dados compartilhados apenas para a configuração técnica da comunicação necessária.",
    placeholder: "Ex.: login técnico, senha de app ou orientação do responsável de TI",
  },
  {
    id: "portal-cliente",
    name: "Portal do cliente ou outro conector",
    description: "A estrutura desta etapa já permite novas integrações futuras sem exigir configuração técnica operacional pelo cliente.",
    placeholder: "Ex.: chave de API, usuário técnico ou observação controlada",
  },
] as const;

function normalizeIntegrations(stageData: any) {
  const current = Array.isArray(stageData?.integrations) ? stageData.integrations : [];
  return baseIntegrations.map((integration) => {
    const existing = current.find((item: any) => item.id === integration.id) ?? {};
    return {
      ...integration,
      status: (existing.status ?? "AGUARDANDO_DADOS") as StageThreeIntegrationStatus,
      accessLabel: existing.accessLabel ?? "",
      secretValue: existing.secretValue ?? "",
      notes: existing.notes ?? "",
      lastSubmittedAt: existing.lastSubmittedAt ?? "",
    };
  });
}

export function StageThreePage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formQuery = useQuery({
    queryKey: ["form", formId, "stage-three"],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = formQuery.data;
  const access = getStageAccess(form);
  const stageAvailable = access.stage03Released;
  const [draft, setDraft] = React.useState<any[]>([]);

  React.useEffect(() => {
    setDraft(normalizeIntegrations(form?.stepData?.stage3));
  }, [form?.id, JSON.stringify(form?.stepData?.stage3 ?? {})]);

  const saveMutation = useMutation({
    mutationFn: async (nextDraft: any[]) =>
      (
        await api.put(`/api/forms/${formId}/step/7`, {
          stepIndex: 7,
          data: {
            stage3: {
              integrations: nextDraft.map((item) => ({
                id: item.id,
                name: item.name,
                accessLabel: item.accessLabel,
                secretValue: item.secretValue,
                notes: item.notes,
                status:
                  item.status === "EM_CONFIGURACAO" || item.status === "AJUSTE_NECESSARIO" || item.status === "CONFIGURADA"
                    ? item.status
                    : item.accessLabel || item.secretValue
                      ? "DADOS_ENVIADOS"
                      : "AGUARDANDO_DADOS",
                lastSubmittedAt: item.accessLabel || item.secretValue ? new Date().toISOString() : item.lastSubmittedAt ?? "",
              })),
            },
          },
          currentStep: Math.max(form?.currentStep ?? 7, 7),
        })
      ).data.form as OnboardingForm,
    onSuccess: (updatedForm) => {
      toast({ message: "Dados técnicos registrados com sucesso.", severity: "success" });
      queryClient.setQueryData(["form", formId, "stage-three"], updatedForm);
      queryClient.setQueryData(["form", formId], updatedForm);
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível registrar os dados técnicos.", severity: "error" });
    },
  });

  function updateIntegration(id: string, patch: Record<string, any>) {
    setDraft((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <AppShell title="Etapa 03 • Automações e integrações" formId={formId}>
      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
              <Box sx={{ maxWidth: 860 }}>
                <Typography variant="h5">Etapa 03 • Automações e integrações</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Esta etapa não possui treinamento. O cliente recebe orientações por integração e, quando necessário, compartilha os dados técnicos mínimos para que a equipe Honorarium realize a configuração.
                </Typography>
              </Box>
              <Chip sx={{ alignSelf: { xs: "flex-start", lg: "center" }, maxWidth: "100%" }} label={stageAvailable ? "Próxima etapa disponível" : "Disponível após conclusão/liberação administrativa da Etapa 02"} color={stageAvailable ? "success" : "default"} />
            </Stack>
          </CardContent>
        </Card>

        {!stageAvailable ? (
          <Alert severity="info">
            A Etapa 03 ficará acessível após a conclusão da Etapa 02 e a respectiva liberação administrativa.
          </Alert>
        ) : (
          <>
            <Alert severity="info">
              O cliente não precisa conduzir a configuração técnica pesada. Esta área serve apenas para registrar orientações e dados de acesso quando forem realmente necessários.
            </Alert>

            <Box sx={{ display: "grid", gap: 2 }}>
              {draft.map((integration) => (
                <Card key={integration.id}>
                  <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1.25 }}>
                          <HubOutlinedIcon color="action" />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 900, fontSize: 20 }}>{integration.name}</Typography>
                            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
                              {integration.description}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }}>
                          <Chip
                            sx={{ maxWidth: "100%" }}
                            icon={<SettingsSuggestOutlinedIcon />}
                            label={integrationStatuses[integration.status as keyof typeof integrationStatuses]}
                            color={integration.status === "CONFIGURADA" ? "success" : integration.status === "AJUSTE_NECESSARIO" ? "warning" : "default"}
                          />
                          <Chip sx={{ maxWidth: "100%" }} icon={<KeyOutlinedIcon />} label="Acesso restrito à equipe Honorarium" variant="outlined" />
                        </Stack>
                      </Box>

                      <Box sx={{ width: { xs: "100%", lg: 460 }, display: "grid", gap: 1.25 }}>
                        <TextField
                          label="Referência de acesso"
                          value={integration.accessLabel}
                          onChange={(event) => updateIntegration(integration.id, { accessLabel: event.target.value })}
                          placeholder="Ex.: usuário técnico, e-mail da integração ou identificação do ambiente"
                        />
                        <TextField
                          label="Chave, senha ou dado técnico"
                          type="password"
                          value={integration.secretValue}
                          onChange={(event) => updateIntegration(integration.id, { secretValue: event.target.value })}
                          placeholder={integration.placeholder}
                        />
                        <TextField
                          label="Situação atual"
                          select
                          value={integration.status}
                          onChange={(event) => updateIntegration(integration.id, { status: event.target.value })}
                        >
                          {Object.entries(integrationStatuses).map(([value, label]) => (
                            <MenuItem key={value} value={value}>
                              {label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="Orientações complementares"
                          multiline
                          minRows={2}
                          value={integration.notes}
                          onChange={(event) => updateIntegration(integration.id, { notes: event.target.value })}
                          placeholder="Ex.: horário indicado para teste, contato técnico ou observação interna do escritório"
                        />
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} justifyContent="space-between">
              <Button variant="outlined" onClick={() => nav(`/cronograma/${formId}`)}>
                Voltar ao cronograma
              </Button>
              <Button variant="contained" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
                Registrar dados técnicos
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </AppShell>
  );
}
