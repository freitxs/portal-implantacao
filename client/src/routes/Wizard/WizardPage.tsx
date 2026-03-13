import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Box, Button, Card, CardContent, Step, StepLabel, Stepper, Typography, Stack, LinearProgress } from "@mui/material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OnboardingForm } from "../../types";
import { useToast } from "../../components/ToastProvider";

import { StepEmail } from "./steps/StepEmail";
import { StepSystems } from "./steps/StepSystems";
import { StepFactors } from "./steps/StepFactors";
import { StepUploads } from "./steps/StepUploads";
import { StepReview } from "./steps/StepReview";

const steps = ["Sistemas", "Fatores & expectativa", "E-mails, usuários & uploads", "Revisão e envio"];

export function WizardPage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = q.data;
  const [activeStep, setActiveStep] = React.useState(0);
  const [localStepData, setLocalStepData] = React.useState<any>({});
  const didInitStepRef = React.useRef(false);

  React.useEffect(() => {
    didInitStepRef.current = false;
  }, [formId]);

  React.useEffect(() => {
    if (!form) return;

    if (!didInitStepRef.current) {
      const backendStep = form.currentStep ?? 0;
      const mapped = Math.max(backendStep - 1, 0);
      setActiveStep(Math.min(mapped, steps.length - 1));
      didInitStepRef.current = true;
    }

    setLocalStepData(form.stepData ?? {});
  }, [form?.id, form?.updatedAt]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const saveStep = useMutation({
    mutationFn: async (payload: { stepIndex: number; data: any; currentStep?: number }) => {
      const { data } = await api.put(`/api/forms/${formId}/step/${payload.stepIndex}`, payload);
      return data.form as OnboardingForm;
    },
    onError: (err: any) => toast({ message: err?.response?.data?.message ?? "Não foi possível salvar.", severity: "error" }),
    onSuccess: (updatedForm) => {
      qc.setQueryData(["form", formId], updatedForm);
      setLocalStepData(updatedForm.stepData ?? {});
      toast({ message: "Salvo automaticamente.", severity: "success" });
    },
  });

  const submit = useMutation({
    mutationFn: async () => (await api.post(`/api/forms/${formId}/submit`, { confirm: true })).data.form as OnboardingForm,
    onError: (err: any) => toast({ message: err?.response?.data?.message ?? "Não foi possível enviar.", severity: "error" }),
    onSuccess: () => {
      toast({ message: "Enviado com sucesso!", severity: "success" });
      nav(`/resumo/${formId}`);
    },
  });

  function goNext() {
    setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((s) => Math.max(s - 1, 0));
  }

  const isLoading = q.isLoading || !formId;

  return (
    <AppShell title="Jornada de Implantação">
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ "& .MuiStepLabel-label": { fontSize: 12 } }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
        {(q.isFetching || saveStep.isPending || submit.isPending) && <LinearProgress />}
      </Card>

      {isLoading ? (
        <Card>
          <CardContent>
            <Typography>Carregando…</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {activeStep === 0 && (
            <StepSystems
              defaultValues={localStepData.page1}
              onAutoSave={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page1: data }));
                saveStep.mutate({ stepIndex: 0, data: { page1: data }, currentStep: 1 });
              }}
            />
          )}

          {activeStep === 1 && (
            <StepFactors
              defaultValues={localStepData.page2}
              onAutoSave={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page2: data }));
                saveStep.mutate({ stepIndex: 1, data: { page2: data }, currentStep: 2 });
              }}
            />
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <StepEmail
                defaultValues={localStepData.email}
                onAutoSave={(data) => {
                  setLocalStepData((prev: any) => ({ ...prev, email: data }));
                  saveStep.mutate({ stepIndex: 2, data: { email: data }, currentStep: 3 });
                }}
              />
              <StepUploads
                form={form!}
                onAutoSave={(notes) => {
                  setLocalStepData((prev: any) => ({ ...prev, uploads: notes }));
                  saveStep.mutate({ stepIndex: 3, data: { uploads: notes }, currentStep: 3 });
                }}
              />
            </Stack>
          )}

          {activeStep === 3 && <StepReview form={form!} onSubmit={() => submit.mutate()} />}

          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Button variant="outlined" onClick={goBack} disabled={activeStep === 0}>
                  Voltar
                </Button>
                <Box sx={{ flex: 1 }} />
                {activeStep < steps.length - 1 ? (
                  <Button variant="contained" onClick={goNext}>
                    Avançar
                  </Button>
                ) : (
                  <Button variant="contained" color="secondary" onClick={() => submit.mutate()} disabled={form?.status === "ENVIADO"}>
                    Enviar
                  </Button>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Dica: você pode sair e voltar depois — seu progresso é salvo automaticamente por etapa.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </AppShell>
  );
}
