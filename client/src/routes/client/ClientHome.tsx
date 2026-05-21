import React from "react";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import LanOutlinedIcon from "@mui/icons-material/LanOutlined";
import PlayCircleOutlineRoundedIcon from "@mui/icons-material/PlayCircleOutlineRounded";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import { Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { useToast } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import type { OnboardingForm } from "../../types";
import { formatUpdatedAt, getClientStatusLabel, getCurrentStageLabel, getProgressValue, getTimelineStages, type FormListItem } from "./portalUtils";

type ActionCard = {
  title: string;
  value: string;
  description: string;
  actionLabel: string;
  action: () => void | Promise<void>;
  icon: React.ReactNode;
};

const softPanelSx = {
  backgroundColor: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(20,32,51,0.08)",
  boxShadow: "none",
} as const;

function statusTone(status?: string) {
  if (status === "Concluída") return "success";
  if (status === "Em análise") return "warning";
  return "default";
}

export function ClientHome() {
  const nav = useNavigate();
  const { toast } = useToast();

  const formsQuery = useQuery({
    queryKey: ["myForms"],
    queryFn: async () => (await api.get("/api/forms/my")).data.forms as FormListItem[],
    staleTime: 30_000,
  });

  const activeFormId = formsQuery.data?.[0]?.id;
  const activeFormQuery = useQuery({
    queryKey: ["form", activeFormId, "home"],
    queryFn: async () => (await api.get(`/api/forms/${activeFormId}`)).data.form as OnboardingForm,
    enabled: Boolean(activeFormId),
    staleTime: 30_000,
  });

  async function createOrGetDraft() {
    try {
      const { data } = await api.post("/api/forms");
      nav(`/wizard/${data.formId}`);
    } catch (err: any) {
      toast({ message: err?.response?.data?.message ?? "Não foi possível iniciar a etapa.", severity: "error" });
    }
  }

  const activeForm = activeFormQuery.data ?? null;
  const timeline = getTimelineStages(activeForm);
  const stageOne = timeline[0];
  const progressValue = activeForm ? Math.round(getProgressValue(activeForm)) : 0;
  const systemsCount = Object.values(activeForm?.stepData?.page1?.systems ?? {}).reduce<number>((acc, item: any) => acc + ((item?.values ?? []).length ? 1 : 0), 0);
  const filesCount = activeForm?.uploads?.filter((upload) => upload.status !== "EXCLUIDO_ADMIN").length ?? 0;
  const latestUpdate = activeForm ? formatUpdatedAt(activeForm.updatedAt).split(" • ")[0] : null;

  const topCards = [
    {
      label: "Etapa atual",
      value: activeForm ? "Configuração inicial" : "Pronta para início",
      note: activeForm ? getCurrentStageLabel(activeForm) : "A trilha começa por aqui",
    },
    {
      label: "Treinamento",
      value: "Até 2 horas",
      note: "Reunião prevista para a etapa inicial",
    },
    latestUpdate
      ? {
          label: "Atualização",
          value: latestUpdate,
          note: "Último movimento da trilha",
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; note: string }>;

  const actionCards: ActionCard[] = [
    {
      title: "Progresso da Etapa 01",
      value: activeForm ? `${progressValue}%` : "0%",
      description: activeForm ? getCurrentStageLabel(activeForm) : "Abra a etapa para começar.",
      actionLabel: activeFormId ? "Retomar etapa 01" : "Iniciar etapa 01",
      action: activeFormId ? () => nav(`/wizard/${activeFormId}`) : createOrGetDraft,
      icon: <PlayCircleOutlineRoundedIcon fontSize="small" />,
    },
    {
      title: "Próxima ação",
      value: activeForm ? getClientStatusLabel(activeForm) : "Preencher dados",
      description: activeForm?.status === "ENVIADO" ? "Acompanhe a análise da equipe." : "Concluir a etapa atual.",
      actionLabel: "Ver cronograma",
      action: () => nav(activeFormId ? `/cronograma/${activeFormId}` : "/inicio"),
      icon: <AssignmentTurnedInOutlinedIcon fontSize="small" />,
    },
    {
      title: "Sistemas utilizados",
      value: systemsCount ? `${systemsCount} frentes` : "A informar",
      description: "Mapeamento da configuração inicial.",
      actionLabel: "Atualizar sistemas",
      action: activeFormId ? () => nav(`/wizard/${activeFormId}`) : createOrGetDraft,
      icon: <LanOutlinedIcon fontSize="small" />,
    },
    {
      title: "Arquivos da etapa",
      value: filesCount ? `${filesCount} registro(s)` : "A preparar",
      description: "Proposta, contrato e relação de clientes.",
      actionLabel: "Abrir arquivos",
      action: activeFormId ? () => nav(`/arquivos/${activeFormId}`) : createOrGetDraft,
      icon: <FolderOpenOutlinedIcon fontSize="small" />,
    },
    {
      title: "Treinamento inicial",
      value: "Até 2 horas",
      description: "Liberado após a revisão.",
      actionLabel: "Ver agendamento",
      action: activeFormId ? () => nav(`/agendamento/${activeFormId}`) : createOrGetDraft,
      icon: <SchoolOutlinedIcon fontSize="small" />,
    },
  ];

  return (
    <AppShell title="Portal do cliente" formId={activeFormId}>
      <Stack spacing={2.5}>
        <Card
          sx={{
            overflow: "hidden",
            position: "relative",
            backgroundColor: "#143b2e",
            color: "#f8fafc",
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 }, position: "relative" }}>
            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", xl: "1.25fr 0.75fr" } }}>
              <Box>
                <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.4, opacity: 0.76, textTransform: "uppercase" }}>Trilha de implantação</Typography>
                <Typography variant="h4" sx={{ color: "inherit", mt: 1.25, maxWidth: 660 }}>
                  Preparação inicial para uma implantação objetiva.
                </Typography>
                <Typography sx={{ color: "rgba(248,250,252,0.82)", fontSize: 14.5, lineHeight: 1.65, mt: 1.5, maxWidth: 560 }}>
                  Informe os dados da etapa inicial para que a equipe prepare o ambiente antes do treinamento.
                </Typography>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} sx={{ mt: 2.5 }}>
                  <Button variant="contained" color="secondary" onClick={activeFormId ? () => nav(`/wizard/${activeFormId}`) : createOrGetDraft}>
                    {activeFormId ? "Retomar etapa 01" : "Iniciar etapa 01"}
                  </Button>
                  <Button variant="outlined" onClick={() => nav(activeFormId ? `/cronograma/${activeFormId}` : "/inicio")} sx={{ borderColor: "rgba(248,250,252,0.24)", color: "#f8fafc" }}>
                    Ver cronograma
                  </Button>
                </Stack>
              </Box>

              <Card
                sx={{
                  backgroundColor: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(248,250,252,0.14)",
                  boxShadow: "none",
                  color: "#f8fafc",
                }}
              >
                <CardContent sx={{ p: 2.75 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "rgba(248,250,252,0.8)" }}>Situação atual</Typography>
                    <Chip size="small" label={activeForm ? getClientStatusLabel(activeForm) : "Próxima etapa"} sx={{ bgcolor: "rgba(248,250,252,0.2)", color: "#fff", maxWidth: 170 }} />
                  </Stack>

                  <Typography sx={{ color: "#fff", fontSize: 34, fontWeight: 800, letterSpacing: -1.6, mt: 2.2 }}>{activeForm ? `${progressValue}%` : "00%"}</Typography>
                  <Typography sx={{ color: "rgba(248,250,252,0.82)", fontSize: 13.5, lineHeight: 1.55, mt: 0.55, maxWidth: 270 }}>
                    {activeForm ? "Andamento da etapa inicial" : "A etapa aparece aqui assim que for aberta"}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{
                      mt: 2,
                      height: 7,
                      borderRadius: 99,
                      bgcolor: "rgba(248,250,252,0.12)",
                      "& .MuiLinearProgress-bar": { borderRadius: 99, backgroundColor: "#d7a84a" },
                    }}
                  />

                  <Stack spacing={1.25} sx={{ mt: 2.35 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                      <Typography sx={{ fontSize: 12.5, color: "rgba(248,250,252,0.8)" }}>Etapa</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>01 • Configuração inicial</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                      <Typography sx={{ fontSize: 12.5, color: "rgba(248,250,252,0.8)" }}>Treinamento</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>Até 2 horas</Typography>
                    </Box>
                    {latestUpdate ? (
                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                        <Typography sx={{ fontSize: 12.5, color: "rgba(248,250,252,0.8)" }}>Atualização</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, textAlign: "right" }}>{latestUpdate}</Typography>
                      </Box>
                    ) : null}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: `repeat(${topCards.length}, minmax(0, 1fr))` } }}>
          {topCards.map((item) => (
            <Card key={item.label} sx={softPanelSx}>
              <CardContent sx={{ p: 2.6 }}>
                <Typography sx={{ color: "text.secondary", fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.9 }}>{item.label}</Typography>
                <Typography sx={{ fontSize: { xs: 22, md: 24 }, fontWeight: 800, letterSpacing: -1.1, mt: 1.1, lineHeight: 1.15 }}>{item.value}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13, mt: 0.7, maxWidth: 280 }}>{item.note}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "1.05fr 0.95fr" } }}>
          <Card sx={softPanelSx}>
            <CardContent sx={{ p: { xs: 2.8, md: 3.2 } }}>
              <Typography variant="h5">Fluxo da etapa inicial</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: 14, mt: 0.85, maxWidth: 700 }}>Uma sequência simples para preparar o ambiente antes do treinamento.</Typography>

              <Box sx={{ display: "grid", gap: 1.6, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, mt: 2.3 }}>
                {[
                  ["01", "Informações essenciais", "Sistemas, critérios e arquivos."],
                  ["02", "Preparação do ambiente", "Organização da base inicial."],
                  ["03", "Treinamento", "Implantação em até 2 horas."],
                ].map(([index, title, text]) => (
                  <Box
                    key={title}
                    sx={{
                      border: "1px solid rgba(20,32,51,0.08)",
                      borderRadius: 4,
                      minHeight: 164,
                      px: 2.4,
                      py: 2.3,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-start",
                      backgroundColor: "rgba(255,255,255,0.86)",
                    }}
                  >
                    <Typography sx={{ color: "primary.main", fontSize: 12.5, fontWeight: 800, letterSpacing: 0.9 }}>{index}</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, mt: 0.9, letterSpacing: -0.5, lineHeight: 1.35, maxWidth: 180 }}>{title}</Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13.5, lineHeight: 1.6, mt: 0.8, maxWidth: 185 }}>{text}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card sx={softPanelSx}>
            <CardContent sx={{ p: { xs: 2.8, md: 3.2 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
                <Typography variant="h6">Leitura rápida</Typography>
                <Chip size="small" label={stageOne.status} color={statusTone(stageOne.status) as any} />
              </Stack>

              <Stack spacing={1.3} sx={{ mt: 2 }}>
                <Box sx={{ borderBottom: "1px solid rgba(20,32,51,0.08)", pb: 1.3 }}>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Objetivo</Typography>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, mt: 0.45 }}>Preparar a implantação inicial para uma única reunião.</Typography>
                </Box>
                <Box sx={{ borderBottom: "1px solid rgba(20,32,51,0.08)", pb: 1.3 }}>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Cliente</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.45 }}>Informar os dados da etapa.</Typography>
                </Box>
                <Box sx={{ borderBottom: "1px solid rgba(20,32,51,0.08)", pb: 1.3 }}>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Honorarium</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.45 }}>Preparar e organizar o ambiente inicial.</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.8 }}>Próximo passo</Typography>
                  <Typography sx={{ fontSize: 14, color: "text.secondary", mt: 0.45 }}>
                    {activeForm?.status === "ENVIADO" ? "Acompanhar a análise da equipe." : "Concluir a etapa atual."}
                  </Typography>
                </Box>
              </Stack>

              <Button variant="outlined" fullWidth endIcon={<ArrowOutwardRoundedIcon />} sx={{ mt: 2.4 }} onClick={() => nav(activeFormId ? `/cronograma/${activeFormId}` : "/inicio")}>
                Abrir cronograma
              </Button>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "repeat(5, minmax(0, 1fr))" } }}>
          {actionCards.map((card) => (
            <Card key={card.title} sx={softPanelSx}>
              <CardContent sx={{ p: 2.6 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.6, gap: 1 }}>
                  <Box sx={{ width: 38, height: 38, borderRadius: "50%", display: "grid", placeItems: "center", bgcolor: "rgba(19,106,67,0.08)", color: "primary.main" }}>{card.icon}</Box>
                  <Chip size="small" label={card.value} sx={{ maxWidth: 150 }} />
                </Stack>
                <Typography sx={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.7, lineHeight: 1.2, maxWidth: 220 }}>{card.title}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 13.5, mt: 0.85, minHeight: 42, maxWidth: 250 }}>{card.description}</Typography>
                <Button variant="text" sx={{ mt: 1.2, px: 0 }} onClick={card.action}>
                  {card.actionLabel}
                </Button>
              </CardContent>
            </Card>
          ))}
        </Box>

        {formsQuery.data?.length ? (
          <Card sx={softPanelSx}>
            <CardContent sx={{ p: { xs: 2.8, md: 3.2 } }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} justifyContent="space-between" alignItems={{ md: "center" }}>
                <Box>
                  <Typography variant="h6">Registros da trilha</Typography>
                  <Typography sx={{ color: "text.secondary", fontSize: 13.5 }}>Consulte o andamento e retome a etapa quando necessário.</Typography>
                </Box>
                <Button variant="outlined" startIcon={<CalendarMonthOutlinedIcon />} onClick={activeFormId ? () => nav(`/cronograma/${activeFormId}`) : createOrGetDraft}>
                  Ver sequência
                </Button>
              </Stack>

              <Stack spacing={1.2} sx={{ mt: 2 }}>
                {(formsQuery.data ?? []).map((form) => (
                  <Box key={form.id} sx={{ border: "1px solid rgba(20,32,51,0.08)", borderRadius: 5, p: 2, backgroundColor: "rgba(255,255,255,0.72)" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 16, fontWeight: 800 }}>Etapa 01 • Configuração inicial</Typography>
                        <Typography sx={{ color: "text.secondary", fontSize: 13.25, mt: 0.45 }}>{formatUpdatedAt(form.updatedAt)}</Typography>
                      </Box>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
                        <Chip size="small" label={getCurrentStageLabel(form)} />
                        <Button variant="outlined" onClick={() => nav(`/wizard/${form.id}`)}>
                          Retomar
                        </Button>
                        <Button variant="outlined" onClick={() => nav(`/resumo/${form.id}`)}>
                          Resumo
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ) : null}
      </Stack>
    </AppShell>
  );
}
