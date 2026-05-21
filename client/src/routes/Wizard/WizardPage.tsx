import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { Box, Button, Card, CardContent, LinearProgress, Stack, Step, StepLabel, Stepper, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { OnboardingForm } from "../../types";
import { useToast } from "../../components/ToastProvider";
import { FactorsPageSchema, SystemsPageSchema } from "./wizardTypes";
import { StepEmail } from "./steps/StepEmail";
import { StepFactors } from "./steps/StepFactors";
import { StepReview } from "./steps/StepReview";
import { StepSystems } from "./steps/StepSystems";
import { StepUploads } from "./steps/StepUploads";
import { getReviewChecklist } from "./reviewChecklist";

const steps = ["Sistemas", "Fatores e expectativas", "E-mails, usuários e arquivos", "Revisão e agendamento"];

function isPlainObject(value: any) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeStepData(current: any, incoming: any): any {
  if (Array.isArray(incoming)) return incoming;
  if (!isPlainObject(current) || !isPlainObject(incoming)) return incoming;

  const merged: Record<string, any> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = isPlainObject(value) ? mergeStepData(current?.[key], value) : value;
  }
  return merged;
}

export function WizardPage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["form", formId],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
    staleTime: 30_000,
  });

  const form = query.data;
  const [activeStep, setActiveStep] = React.useState(0);
  const [localStepData, setLocalStepData] = React.useState<any>({});
  const didInitStepRef = React.useRef(false);
  const latestSaveRequestRef = React.useRef(0);

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

    setLocalStepData((prev: any) => mergeStepData(prev ?? {}, form.stepData ?? {}));
  }, [form?.id, form?.updatedAt]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep]);

  const saveStep = useMutation({
    mutationFn: async (payload: { stepIndex: number; data: any; currentStep?: number; requestId: number }) => {
      const { requestId, ...requestPayload } = payload;
      const { data } = await api.put(`/api/forms/${formId}/step/${payload.stepIndex}`, requestPayload);
      return { form: data.form as OnboardingForm, requestId };
    },
    onError: (err: any) => toast({ message: err?.response?.data?.message ?? "Não foi possível salvar.", severity: "error" }),
    onSuccess: ({ form: updatedForm, requestId }) => {
      if (requestId !== latestSaveRequestRef.current) return;
      queryClient.setQueryData(["form", formId], updatedForm);
      setLocalStepData((prev: any) => mergeStepData(prev ?? {}, updatedForm.stepData ?? {}));
    },
  });

  function triggerStepSave(payload: { stepIndex: number; data: any; currentStep?: number }) {
    latestSaveRequestRef.current += 1;
    saveStep.mutate({ ...payload, requestId: latestSaveRequestRef.current });
  }

  const confirmReview = useMutation({
    mutationFn: async () => {
      const nextReviewState = {
        ...(localStepData.review ?? {}),
        confirmedAt: localStepData.review?.confirmedAt ?? new Date().toISOString(),
        confirmedForScheduling: true,
      };
      const { data } = await api.put(`/api/forms/${formId}/step/4`, {
        stepIndex: 4,
        data: { review: nextReviewState },
        currentStep: 4,
      });
      return data.form as OnboardingForm;
    },
    onError: (err: any) => toast({ message: err?.response?.data?.message ?? "Não foi possível confirmar a revisão.", severity: "error" }),
    onSuccess: (updatedForm) => {
      queryClient.setQueryData(["form", formId], updatedForm);
      queryClient.setQueryData(["form", formId, "schedule"], updatedForm);
      queryClient.setQueryData(["form", formId, "shell"], updatedForm);
      setLocalStepData((prev: any) => mergeStepData(prev ?? {}, updatedForm.stepData ?? {}));
      toast({ message: "Revisão confirmada. O agendamento já está disponível.", severity: "success" });
      nav(`/agendamento/${formId}`);
    },
  });

  function goNext() {
    if (activeStep === 0) {
      const parsed = SystemsPageSchema.safeParse(localStepData.page1 ?? {});
      if (!parsed.success) {
        toast({ message: "Selecione o ERP contábil e o ambiente do ERP para avançar.", severity: "warning" });
        return;
      }
    }

    if (activeStep === 1) {
      const parsed = FactorsPageSchema.safeParse(localStepData.page2 ?? {});
      if (!parsed.success) {
        toast({ message: "Selecione ao menos um critério de precificação e uma expectativa principal.", severity: "warning" });
        return;
      }
    }

    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function handleReviewSubmit() {
    if (!form) return;

    const reviewForm: OnboardingForm = {
      ...form,
      stepData: localStepData,
    };
    const checklist = getReviewChecklist(reviewForm);

    if (!checklist.allComplete) {
      toast({ message: "Complete as informações necessárias desta revisão antes de liberar o calendário.", severity: "warning" });
      return;
    }

    confirmReview.mutate();
  }

  function goToSection(section: "systems" | "pricing" | "files" | "email" | "clients") {
    if (section === "systems") setActiveStep(0);
    if (section === "pricing") setActiveStep(1);
    if (section === "email") setActiveStep(2);
    if (section === "files" || section === "clients") nav(`/arquivos/${formId}`);
  }

  const isLoading = query.isLoading || !formId;
  const reviewForm = form ? ({ ...form, stepData: localStepData } as OnboardingForm) : null;

  return (
    <AppShell title="Etapa 01 • Informações iniciais" formId={formId}>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stepper
            activeStep={activeStep}
            alternativeLabel={false}
            sx={{
              overflowX: "auto",
              pb: 0.5,
              "& .MuiStep-root": { minWidth: 160 },
              "& .MuiStepLabel-label": { fontSize: 12.5, whiteSpace: "nowrap" },
            }}
          >
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
        {(query.isFetching || saveStep.isPending || confirmReview.isPending) && <LinearProgress />}
      </Card>

      {isLoading ? (
        <Card>
          <CardContent>
            <Typography>Carregando...</Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: "grid", gap: 2 }}>
          {activeStep === 0 ? (
            <StepSystems
              defaultValues={localStepData.page1}
              onDraftChange={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page1: data }));
              }}
              onAutoSave={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page1: data }));
                triggerStepSave({ stepIndex: 0, data: { page1: data }, currentStep: 1 });
              }}
            />
          ) : null}

          {activeStep === 1 ? (
            <StepFactors
              defaultValues={localStepData.page2}
              onDraftChange={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page2: data }));
              }}
              onAutoSave={(data) => {
                setLocalStepData((prev: any) => ({ ...prev, page2: data }));
                triggerStepSave({ stepIndex: 1, data: { page2: data }, currentStep: 2 });
              }}
            />
          ) : null}

          {activeStep === 2 ? (
            <Stack spacing={2}>
              <StepEmail
                defaultValues={localStepData.email}
                onDraftChange={(data) => {
                  setLocalStepData((prev: any) => ({ ...prev, email: data }));
                }}
                onAutoSave={(data) => {
                  setLocalStepData((prev: any) => ({ ...prev, email: data }));
                  triggerStepSave({ stepIndex: 2, data: { email: data }, currentStep: 3 });
                }}
              />
              <StepUploads
                form={reviewForm!}
                onAutoSave={(notes) => {
                  setLocalStepData((prev: any) => ({ ...prev, uploads: notes }));
                  triggerStepSave({ stepIndex: 3, data: { uploads: notes }, currentStep: 3 });
                }}
              />
            </Stack>
          ) : null}

          {activeStep === 3 && reviewForm ? (
            <StepReview form={reviewForm} onSubmit={handleReviewSubmit} onGoToSection={goToSection} />
          ) : null}

          <Card>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
                <Button variant="outlined" onClick={goBack} disabled={activeStep === 0}>
                  Voltar
                </Button>
                <Box sx={{ flex: 1 }} />
                {activeStep < steps.length - 1 ? (
                  <Button variant="contained" onClick={goNext}>
                    Avançar
                  </Button>
                ) : (
                  <Typography color="text.secondary" sx={{ textAlign: { xs: "left", sm: "right" }, maxWidth: 420 }}>
                    Use a confirmação da revisão acima para liberar o calendário e seguir para o agendamento.
                  </Typography>
                )}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Seu progresso é salvo automaticamente por etapa.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
    </AppShell>
  );
}
