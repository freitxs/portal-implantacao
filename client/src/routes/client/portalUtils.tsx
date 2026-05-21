import dayjs from "../../lib/dayjs";
import type { OnboardingForm } from "../../types";

export type FormListItem = {
  id: string;
  status: "RASCUNHO" | "ENVIADO";
  currentStep: number;
  createdAt: string;
  updatedAt: string;
};

export function getCurrentStageLabel(form: Pick<FormListItem, "status" | "currentStep">) {
  if (form.status === "ENVIADO") return "Em análise";
  if (form.currentStep >= 3) return "Enviada pelo cliente";
  if (form.currentStep >= 1) return "Em preenchimento";
  return "Pronta para início";
}

export function getProgressValue(form: Pick<FormListItem, "status" | "currentStep">) {
  if (form.status === "ENVIADO") return 100;
  return Math.max(14, Math.min(88, (form.currentStep / 4) * 100));
}

export function getStageAccess(form?: Pick<OnboardingForm, "stepData"> | null) {
  const stepData = form?.stepData ?? {};
  const stage01Completed = stepData.stage01Completion?.status === "CONCLUIDA";
  const stage02Released = Boolean(stage01Completed && stepData.stageAccess?.stage2Released);
  const stage02Completed = stepData.stage02?.status === "CONCLUIDA" || (stepData.stageAccess?.stage3Released && stage02Released);
  const stage03Released = Boolean(stage02Completed && stepData.stageAccess?.stage3Released);
  const stage03Completed = stepData.stage03?.status === "CONCLUIDA";

  return {
    stage01Completed,
    stage02Released,
    stage02Completed,
    stage03Released,
    stage03Completed,
  };
}

export function getClientStatusLabel(form?: Pick<OnboardingForm, "status" | "currentStep" | "stepData"> | null) {
  if (!form) return "Próxima etapa";
  if (form.stepData?.stage01Completion?.status === "CONCLUIDA") return "Concluída";
  if (form.status === "ENVIADO") return "Em análise";
  if (form.stepData?.review?.confirmedAt) return "Próxima etapa disponível";
  if (form.currentStep >= 3) return "Enviada pelo cliente";
  return "Em preenchimento";
}

export function getTimelineStages(form?: Pick<OnboardingForm, "status" | "currentStep" | "stepData"> | null) {
  const access = getStageAccess(form);
  const stage01Status = access.stage01Completed ? "Concluída" : getClientStatusLabel(form);
  const stage2Uploads = form?.stepData?.stage2?.uploads ?? [];
  const stage3Integrations = form?.stepData?.stage3?.integrations ?? [];
  const stage2HasAdjustment = stage2Uploads.some((item: any) => item?.status === "AJUSTE_NECESSARIO");
  const stage2HasAnalysis = stage2Uploads.some((item: any) => ["EM_ANALISE", "VALIDADO", "SUBSTITUIDO"].includes(item?.status));
  const stage2HasClientSend = stage2Uploads.some((item: any) => item?.status === "ENVIADO");
  const stage3HasAdjustment = stage3Integrations.some((item: any) => item?.status === "AJUSTE_NECESSARIO");
  const stage3HasConfiguration = stage3Integrations.some((item: any) => ["EM_CONFIGURACAO", "CONFIGURADA"].includes(item?.status));
  const stage3HasClientSend = stage3Integrations.some((item: any) => item?.status === "DADOS_ENVIADOS");

  return [
    {
      key: "etapa-01",
      title: "Etapa 01",
      subtitle: "Configuração inicial",
      training: "Treinamento inicial de até 2 horas",
      description: "Cliente informa os dados. A equipe prepara o ambiente.",
      status: stage01Status,
      available: true,
      actionLabel: access.stage01Completed ? "Resumo concluído" : "Em preenchimento",
      route: "wizard",
    },
    {
      key: "etapa-02",
      title: "Etapa 02",
      subtitle: "Painéis e histórico",
      training: "Sem treinamento",
      description: "Cliente envia os relatórios. A equipe valida e configura os painéis.",
      status: access.stage02Completed
        ? "Concluída"
        : !access.stage02Released
          ? "Disponível após a Etapa 01"
          : stage2HasAdjustment
            ? "Ajuste necessário"
            : stage2HasAnalysis
              ? "Em análise"
              : stage2HasClientSend
                ? "Enviada pelo cliente"
                : "Próxima etapa disponível",
      available: access.stage02Released,
      actionLabel: "Arquivos e instruções",
      route: "etapa-02",
    },
    {
      key: "etapa-03",
      title: "Etapa 03",
      subtitle: "Automações e integrações",
      training: "Sem treinamento",
      description: "Cliente compartilha os dados técnicos quando necessário. A equipe conclui a configuração.",
      status: access.stage03Completed
        ? "Concluída"
        : !access.stage03Released
          ? "Disponível após a Etapa 02"
          : stage3HasAdjustment
            ? "Ajuste necessário"
            : stage3HasConfiguration
              ? "Em análise"
              : stage3HasClientSend
                ? "Enviada pelo cliente"
                : "Próxima etapa disponível",
      available: access.stage03Released,
      actionLabel: "Dados técnicos",
      route: "etapa-03",
    },
  ];
}

export function getMilestones(form?: Pick<OnboardingForm, "status" | "currentStep" | "stepData"> | null) {
  return getTimelineStages(form).map((stage) => ({
    title: `${stage.title} • ${stage.subtitle}`,
    subtitle: stage.training,
    state: stage.status,
  }));
}

export function formatUpdatedAt(date: string) {
  return `${dayjs(date).format("DD/MM/YYYY HH:mm")} • atualização ${dayjs(date).fromNow?.() ?? dayjs(date).format("DD/MM/YYYY HH:mm")}`;
}
