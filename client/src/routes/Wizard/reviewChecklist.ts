import type { OnboardingForm, UploadType } from "../../types";

export type ReviewSectionStatus = {
  key: "systems" | "pricing" | "files" | "email" | "clients";
  title: string;
  status: "CONCLUIDO" | "AJUSTE_NECESSARIO";
  details: Array<{ label: string; done: boolean }>;
};

type ReviewSectionDraft = Omit<ReviewSectionStatus, "status">;

function activeUpload(form: OnboardingForm, type: UploadType) {
  return (form.uploads ?? []).find((upload) => upload.type === type && upload.status !== "EXCLUIDO_ADMIN");
}

function hasUsers(email: any) {
  return (email?.users ?? []).some((user: any) => Boolean(user?.name?.trim()) && Boolean(user?.email?.trim()));
}

function hasEmailProvider(email: any) {
  const providers = email?.providerOptions ?? [];
  const standardProviderSelected = providers.some((item: string) => item !== "Não sei" && item !== "Não sei informar" && item !== "Outro");
  const customProviderSelected = providers.includes("Outro") && Boolean(email?.providerOtherText?.trim());
  const doesntKnowProvider =
    (providers.includes("Não sei") || providers.includes("Não sei informar")) &&
    Boolean(email?.tiContactName?.trim()) &&
    Boolean(email?.tiContactPhone?.trim());
  return standardProviderSelected || customProviderSelected || doesntKnowProvider;
}

export function getReviewChecklist(form: OnboardingForm) {
  const data = form.stepData ?? {};
  const page1 = data.page1 ?? {};
  const page2 = data.page2 ?? {};
  const email = data.email ?? {};
  const uploadsState = data.uploads ?? {};

  const proposalReady =
    Boolean(activeUpload(form, "PROPOSTA")) ||
    (Boolean(uploadsState.noProposalTemplate) && Boolean(uploadsState.selectedProposalTemplateId));

  const contractReady =
    Boolean(activeUpload(form, "CONTRATO")) ||
    ((Boolean(uploadsState.contractStandardViewedAt) || Boolean(uploadsState.contractStandardDownloadedAt)) &&
      Boolean(uploadsState.contractAcknowledged));

  const clientsReady = Boolean(activeUpload(form, "RELACAO_CLIENTES"));

  const sectionDrafts: ReviewSectionDraft[] = [
    {
      key: "systems",
      title: "Sistemas",
      details: [
        { label: "ERP informado", done: Boolean(page1?.systems?.erpContabil?.values?.length) },
        { label: "Ambiente do ERP informado", done: Boolean(page1?.erpEnvironment) },
      ],
    },
    {
      key: "pricing",
      title: "Precificação e expectativas",
      details: [
        { label: "Critérios de precificação selecionados", done: Boolean(page2?.pricingFactors?.length) },
        { label: "Expectativa principal selecionada", done: Boolean(page2?.expectation) },
      ],
    },
    {
      key: "files",
      title: "Arquivos",
      details: [
        { label: "Proposta pronta para análise", done: proposalReady },
        { label: "Contrato pronto para análise", done: contractReady },
      ],
    },
    {
      key: "email",
      title: "E-mails e usuários",
      details: [
        { label: "Provedor de e-mail ou apoio de TI informado", done: hasEmailProvider(email) },
        { label: "Usuários iniciais informados", done: hasUsers(email) },
      ],
    },
    {
      key: "clients",
      title: "Relação de clientes",
      details: [{ label: "Planilha da relação de clientes enviada", done: clientsReady }],
    },
  ];

  const sections: ReviewSectionStatus[] = sectionDrafts.map((section) => ({
    ...section,
    status: section.details.every((detail) => detail.done) ? "CONCLUIDO" : "AJUSTE_NECESSARIO",
  }));

  const missingItems = sections.flatMap((section) =>
    section.details.filter((detail) => !detail.done).map((detail) => `${section.title}: ${detail.label}`)
  );

  return {
    sections,
    allComplete: missingItems.length === 0,
    reviewConfirmed: Boolean(data.review?.confirmedAt),
    missingItems,
    reviewData: data.review ?? {},
  };
}
