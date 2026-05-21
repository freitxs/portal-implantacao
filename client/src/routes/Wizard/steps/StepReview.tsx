import React from "react";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { OnboardingForm } from "../../../types";
import { getReviewChecklist } from "../reviewChecklist";

type StepReviewProps = {
  form: OnboardingForm;
  onSubmit: () => void;
  onGoToSection?: (section: "systems" | "pricing" | "files" | "email" | "clients") => void;
};

export function StepReview({ form, onSubmit, onGoToSection }: StepReviewProps) {
  const checklist = getReviewChecklist(form);

  return (
    <Stack spacing={2.5}>
      <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.75 }}>
            Revisão antes do agendamento
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 840 }}>
            Confira os pontos principais da Etapa 01 antes de abrir o agendamento.
          </Typography>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        }}
      >
        {checklist.sections.map((section) => {
          const completed = section.status === "CONCLUIDO";

          return (
            <Card key={section.key} variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.12)" }}>
              <CardContent sx={{ p: 2.75 }}>
                <Stack direction="row" justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {section.title}
                    </Typography>
                    <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                      {completed ? "Os itens desta seção já estão prontos." : "Falta concluir os itens principais desta seção."}
                    </Typography>
                  </Box>
                  <Chip
                    icon={completed ? <CheckCircleRoundedIcon /> : <PendingActionsRoundedIcon />}
                    label={completed ? "Concluído" : "Ajuste necessário"}
                    color={completed ? "success" : "warning"}
                    variant={completed ? "filled" : "outlined"}
                    sx={{ fontWeight: 700 }}
                  />
                </Stack>

                <Stack spacing={1}>
                  {section.details.map((detail) => (
                    <Stack
                      key={detail.label}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                      sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 2, px: 1.5, py: 1.1 }}
                    >
                      <Typography sx={{ fontSize: 14.5 }}>{detail.label}</Typography>
                      <Chip
                        label={detail.done ? "Concluído" : "Ajuste necessário"}
                        size="small"
                        color={detail.done ? "success" : "warning"}
                        variant={detail.done ? "filled" : "outlined"}
                      />
                    </Stack>
                  ))}
                </Stack>

                {!completed && onGoToSection ? (
                  <Button sx={{ mt: 2 }} variant="text" onClick={() => onGoToSection(section.key)}>
                    Ajustar esta seção
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {checklist.allComplete ? (
        <Alert severity="success" sx={{ alignItems: "center" }}>
          A Etapa 01 está pronta para seguir ao agendamento.
        </Alert>
      ) : (
        <Alert severity="info" sx={{ alignItems: "flex-start" }}>
          <Stack spacing={1}>
            <Typography sx={{ fontWeight: 700 }}>Conclua os itens abaixo para liberar o calendário:</Typography>
            <Stack spacing={0.75}>
              {checklist.missingItems.map((item) => (
                <Typography key={item} sx={{ fontSize: 14.5 }}>
                  {item}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="flex-end">
        <Button variant="contained" color="secondary" onClick={onSubmit} disabled={!checklist.allComplete}>
          {checklist.reviewConfirmed ? "Ir para agendamento" : "Confirmar revisão e agendar"}
        </Button>
      </Stack>
    </Stack>
  );
}
