import { z } from "zod";
import type { Regime, PricingRow, Sector } from "../../types";

const EmailUserSchema = z
  .object({
    name: z.string().max(120).optional().default(""),
    email: z.string().max(200).optional().default(""),
    roleOrFunction: z.string().max(120).optional().default(""),
    attendsTraining: z.boolean().optional().default(false),
    isEnvironmentAdmin: z.boolean().optional().default(false),
  })
  .default({
    name: "",
    email: "",
    roleOrFunction: "",
    attendsTraining: false,
    isEnvironmentAdmin: false,
  });

export const EmailSetupSchema = z
  .object({
    providerOptions: z.array(z.string()).default([]),
    providerOtherText: z.string().max(120).optional().default(""),
    tiContactName: z.string().max(120).optional().default(""),
    tiContactPhone: z.string().max(40).optional().default(""),
    users: z.array(EmailUserSchema).optional().default([
      {
        name: "",
        email: "",
        roleOrFunction: "",
        attendsTraining: false,
        isEnvironmentAdmin: false,
      },
    ]),
  })
  .default({
    providerOptions: [],
    providerOtherText: "",
    tiContactName: "",
    tiContactPhone: "",
    users: [
      {
        name: "",
        email: "",
        roleOrFunction: "",
        attendsTraining: false,
        isEnvironmentAdmin: false,
      },
    ],
  });

export type EmailSetupValues = z.infer<typeof EmailSetupSchema>;

export const OfficeSchema = z.object({
  officeName: z.string().min(2, "Informe o nome do escritório."),
  responsibleName: z.string().min(2, "Informe o nome do responsável."),
  whatsapp: z.string().min(10, "Informe um WhatsApp válido."),
  email: z.string().email("Informe um e-mail válido."),
  cityUf: z.string().min(2, "Informe a cidade/UF."),
  activeCompanies: z.coerce.number().int().min(0, "Informe um número válido."),
});
export type OfficeValues = z.infer<typeof OfficeSchema>;

export const ProfileSchema = z.object({
  regimes: z.array(z.enum(["SIMPLES", "PRESUMIDO", "REAL"]))
    .min(1, "Selecione ao menos um regime."),
  sectors: z.array(z.enum(["COMERCIO", "SERVICOS", "INDUSTRIA", "NAO_SEI"]))
    .min(1, "Selecione ao menos um setor."),
});
export type ProfileValues = z.infer<typeof ProfileSchema>;

export type PricingBySectorRegime = Record<Sector, Record<Regime, PricingRow[]>>;

export const ErpEnvironmentSchema = z.enum(["WEB_CLOUD", "SERVIDOR_PROPRIO", "SERVIDOR_REMOTO"]);
export type ErpEnvironment = z.infer<typeof ErpEnvironmentSchema>;

const SystemCategorySchema = z
  .object({
    values: z.array(z.string()).default([]),
    otherText: z.string().max(200).optional().default(""),
  })
  .default({ values: [], otherText: "" });

const SystemsShape = {
  erpContabil: SystemCategorySchema,
  capturaArmazenamento: SystemCategorySchema,
  gestaoProcessos: SystemCategorySchema,
  bi: SystemCategorySchema,
  cnd: SystemCategorySchema,
  auditoriaConsultoriaAutomacao: SystemCategorySchema,
  conciliacaoContabil: SystemCategorySchema,
  financeiroBpo: SystemCategorySchema,
  outrosSistemas: SystemCategorySchema,
} as const;

const SystemsDefaultValues = {
  erpContabil: { values: [], otherText: "" },
  capturaArmazenamento: { values: [], otherText: "" },
  gestaoProcessos: { values: [], otherText: "" },
  bi: { values: [], otherText: "" },
  cnd: { values: [], otherText: "" },
  auditoriaConsultoriaAutomacao: { values: [], otherText: "" },
  conciliacaoContabil: { values: [], otherText: "" },
  financeiroBpo: { values: [], otherText: "" },
  outrosSistemas: { values: [], otherText: "" },
};

export const SystemsPageSchema = z
  .object({
    systems: z.object(SystemsShape).default(SystemsDefaultValues),
    erpEnvironment: ErpEnvironmentSchema,
    systemsComment: z.string().max(1000).optional().default(""),
  })
  .superRefine((data, ctx) => {
    if ((data.systems.erpContabil.values ?? []).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["systems", "erpContabil", "values"],
        message: "Selecione o ERP contábil para avançar.",
      });
    }
  })
  .default({
    systems: SystemsDefaultValues,
    erpEnvironment: "WEB_CLOUD",
    systemsComment: "",
  });

export const SystemsPageDraftSchema = z
  .object({
    systems: z.object(SystemsShape).default(SystemsDefaultValues),
    erpEnvironment: ErpEnvironmentSchema.optional(),
    systemsComment: z.string().max(1000).optional().default(""),
  })
  .default({
    systems: SystemsDefaultValues,
    erpEnvironment: undefined,
    systemsComment: "",
  });

export type SystemsPageValues = z.infer<typeof SystemsPageSchema>;
export type SystemsPageDraftValues = z.infer<typeof SystemsPageDraftSchema>;

export const EXPECTATION_OPTIONS = [
  "Agilidade em propostas",
  "Padronização da precificação",
  "Identificação de defasagem de honorários",
  "Apresentação de pacotes",
  "Jornada dos clientes",
  "Gestão de contratos",
] as const;

export const FactorsPageSchema = z.object({
  pricingFactors: z.array(z.string()).min(1, "Selecione ao menos um critério de precificação."),
  pricingFactorsComment: z.string().max(1000).optional().default(""),
  pricingFactorsOtherText: z.string().max(200).optional().default(""),
  honorariumHighlights: z.array(z.string()).min(1, "Selecione uma expectativa principal."),
  expectation: z.enum(EXPECTATION_OPTIONS),
});

export const FactorsPageDraftSchema = z.object({
  pricingFactors: z.array(z.string()).default([]),
  pricingFactorsComment: z.string().max(1000).optional().default(""),
  pricingFactorsOtherText: z.string().max(200).optional().default(""),
  honorariumHighlights: z.array(z.string()).default([]),
  expectation: z.enum(EXPECTATION_OPTIONS).optional(),
});

export type FactorsPageValues = z.infer<typeof FactorsPageSchema>;
export type FactorsPageDraftValues = z.infer<typeof FactorsPageDraftSchema>;

export const UploadNotesSchema = z.object({
  contractNotes: z.string().max(2000).optional().default(""),
  proposalNotes: z.string().max(2000).optional().default(""),
  clientListNotes: z.string().max(2000).optional().default(""),
  noContractTemplate: z.boolean().optional().default(false),
  noProposalTemplate: z.boolean().optional().default(false),
  selectedProposalTemplateId: z.string().max(120).optional().default(""),
  contractStandardViewedAt: z.string().optional().default(""),
  contractStandardDownloadedAt: z.string().optional().default(""),
  contractAcknowledged: z.boolean().optional().default(false),
  contractAcknowledgedAt: z.string().optional().default(""),
});
export type UploadNotesValues = z.infer<typeof UploadNotesSchema>;
