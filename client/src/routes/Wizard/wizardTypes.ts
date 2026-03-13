import { z } from "zod";
import type { Regime, PricingRow, Sector } from "../../types";

const EmailUserSchema = z
  .object({
    name: z.string().max(120).optional().default(""),
    email: z.string().max(200).optional().default(""),
  })
  .default({ name: "", email: "" });

export const EmailSetupSchema = z
  .object({
    providerOptions: z.array(z.string()).default([]),
    providerOtherText: z.string().max(120).optional().default(""),
    tiContactName: z.string().max(120).optional().default(""),
    tiContactPhone: z.string().max(40).optional().default(""),
    users: z.array(EmailUserSchema).optional().default([{ name: "", email: "" }]),
  })
  .default({
    providerOptions: [],
    providerOtherText: "",
    tiContactName: "",
    tiContactPhone: "",
    users: [{ name: "", email: "" }],
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

const SystemCategorySchema = z
  .object({
    values: z.array(z.string()).default([]),
    otherText: z.string().max(200).optional().default(""),
  })
  .default({ values: [], otherText: "" });

export const SystemsPageSchema = z
  .object({
    systems: z
      .object({
        erpContabil: SystemCategorySchema,
        capturaArmazenamento: SystemCategorySchema,
        gestaoProcessos: SystemCategorySchema,
        bi: SystemCategorySchema,
        cnd: SystemCategorySchema,
        auditoriaConsultoriaAutomacao: SystemCategorySchema,
        conciliacaoContabil: SystemCategorySchema,
        financeiroBpo: SystemCategorySchema,
      })
      .default({
        erpContabil: { values: [], otherText: "" },
        capturaArmazenamento: { values: [], otherText: "" },
        gestaoProcessos: { values: [], otherText: "" },
        bi: { values: [], otherText: "" },
        cnd: { values: [], otherText: "" },
        auditoriaConsultoriaAutomacao: { values: [], otherText: "" },
        conciliacaoContabil: { values: [], otherText: "" },
        financeiroBpo: { values: [], otherText: "" },
      }),

    systemsComment: z.string().max(1000).optional().default(""),
  })
  .default({
    systems: {
      erpContabil: { values: [], otherText: "" },
      capturaArmazenamento: { values: [], otherText: "" },
      gestaoProcessos: { values: [], otherText: "" },
      bi: { values: [], otherText: "" },
      cnd: { values: [], otherText: "" },
      auditoriaConsultoriaAutomacao: { values: [], otherText: "" },
      conciliacaoContabil: { values: [], otherText: "" },
      financeiroBpo: { values: [], otherText: "" },
    },
    systemsComment: "",
  });

export type SystemsPageValues = z.infer<typeof SystemsPageSchema>;

export const FactorsPageSchema = z
  .object({
    pricingFactors: z.array(z.string()).default([]),
    pricingFactorsComment: z.string().max(1000).optional().default(""),
    honorariumHighlights: z.array(z.string()).default([]),
    expectation: z.string().max(1000).optional().default(""),
  })
  .default({
    pricingFactors: [],
    pricingFactorsComment: "",
    honorariumHighlights: [],
    expectation: "",
  });

export type FactorsPageValues = z.infer<typeof FactorsPageSchema>;

export const UploadNotesSchema = z.object({
  contractNotes: z.string().max(2000).optional().default(""),
  proposalNotes: z.string().max(2000).optional().default(""),
  noContractTemplate: z.boolean().optional().default(false),
  noProposalTemplate: z.boolean().optional().default(false),
});
export type UploadNotesValues = z.infer<typeof UploadNotesSchema>;
