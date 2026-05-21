import React from "react";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import LockClockOutlinedIcon from "@mui/icons-material/LockClockOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { api } from "../../lib/api";
import type { OnboardingForm } from "../../types";
import { getTimelineStages } from "./portalUtils";

function getStageIcon(status: string, available: boolean) {
  if (status === "Concluída") return <CheckCircleOutlineRoundedIcon color="success" />;
  if (available) return <PlayCircleOutlineRoundedIcon color="primary" />;
  return <LockClockOutlinedIcon color="disabled" />;
}

export function TimelinePage() {
  const { formId } = useParams();
  const nav = useNavigate();

  const query = useQuery({
    queryKey: ["form", formId, "timeline"],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = query.data;
  const stages = getTimelineStages(form);

  function handleStageAccess(route: string) {
    if (route === "wizard") nav(`/wizard/${formId}`);
    if (route === "etapa-02") nav(`/etapa-02/${formId}`);
    if (route === "etapa-03") nav(`/etapa-03/${formId}`);
  }

  return (
    <AppShell title="Cronograma da Trilha de Implantação" formId={formId}>
      <Stack spacing={3}>
        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} justifyContent="space-between">
              <Box sx={{ maxWidth: 840 }}>
                <Typography variant="h5">Cronograma da trilha</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  Veja a sequência das etapas e acesse cada área conforme a liberação da trilha.
                </Typography>
              </Box>
              <Chip label="Etapa 01 com treinamento de até 2 horas" color="success" />
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 2 }}>
          {stages.map((stage, index) => (
            <Card key={stage.key}>
              <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                <Stack direction={{ xs: "column", lg: "row" }} spacing={2.5} justifyContent="space-between">
                  <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ flex: 1 }}>
                    <Box sx={{ pt: 0.25 }}>{getStageIcon(stage.status, stage.available)}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                        <Box>
                          <Typography sx={{ fontWeight: 900, fontSize: 20 }}>{stage.title}</Typography>
                          <Typography color="text.secondary" sx={{ mt: 0.25, fontWeight: 700 }}>
                            {stage.subtitle}
                          </Typography>
                        </Box>
                        <Chip sx={{ alignSelf: { xs: "flex-start", md: "center" }, maxWidth: "100%" }} label={stage.status} size="small" color={stage.available || stage.status === "Concluída" ? "success" : "default"} />
                      </Stack>

                      <Typography color="text.secondary" sx={{ mt: 1.25, lineHeight: 1.65 }}>
                        {stage.description}
                      </Typography>

                      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ mt: 2 }}>
                        <Chip icon={<SchoolOutlinedIcon />} label={stage.training} variant={index === 0 ? "filled" : "outlined"} color={index === 0 ? "success" : "default"} />
                        <Chip label={stage.actionLabel} variant="outlined" />
                      </Stack>
                    </Box>
                  </Stack>

                  <Stack spacing={1.25} sx={{ minWidth: { lg: 280 }, width: { xs: "100%", lg: "auto" } }}>
                    <Button variant={index === 0 || stage.available ? "contained" : "outlined"} disabled={index !== 0 && !stage.available} onClick={() => handleStageAccess(stage.route)}>
                      {index === 0 ? "Acessar Etapa 01" : stage.available ? `Acessar ${stage.title}` : "Disponível após liberação"}
                    </Button>
                    {index === 0 ? (
                      <Button variant="outlined" onClick={() => nav(`/resumo/${formId}`)}>
                        Ver resumo da etapa
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Card>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Typography variant="h6">Leitura rápida</Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, mt: 2 }}>
              <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Etapa 01</Typography>
                <Typography color="text.secondary">Preparação inicial com treinamento de até 2 horas.</Typography>
              </Box>
              <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Etapa 02</Typography>
                <Typography color="text.secondary">Sem treinamento. O cliente envia relatórios e a equipe configura os painéis.</Typography>
              </Box>
              <Box sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 3, p: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 0.75 }}>Etapa 03</Typography>
                <Typography color="text.secondary">Sem treinamento. O cliente informa os dados técnicos e a equipe conclui a configuração.</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
