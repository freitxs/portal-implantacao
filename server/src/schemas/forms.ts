import { z } from "zod";

export const OfficeStepSchema = z.object({
  officeName: z.string().min(2, "Informe o nome do escritório."),
  responsibleName: z.string().min(2, "Informe o nome do responsável."),
  whatsapp: z.string().min(10, "Informe um WhatsApp válido."),
  email: z.string().email("Informe um e-mail válido."),
  cityUf: z.string().min(2, "Informe a cidade/UF."),
  activeCompanies: z.coerce.number().int().min(0, "Informe um número válido."),
});

export const ProfileStepSchema = z.object({
  regimes: z.array(z.enum(["SIMPLES", "PRESUMIDO", "REAL"])).min(1, "Selecione ao menos um regime."),
  sectors: z.array(z.enum(["COMERCIO", "SERVICOS", "INDUSTRIA", "MISTO", "NAO_SEI"]))
    .min(1, "Selecione ao menos um setor."),
});

export const PricingRowSchema = z.object({
  faixaId: z.string().min(1),
  faixaLabel: z.string().min(1),
  value: z.coerce.number().gt(0, "O valor precisa ser maior que zero."),
});

export const PricingTablePayloadSchema = z.object({
  sector: z.enum(["COMERCIO", "SERVICOS", "INDUSTRIA", "MISTO", "NAO_SEI"]),
  regime: z.enum(["SIMPLES", "PRESUMIDO", "REAL"]),
  rows: z.array(PricingRowSchema),
});

export const PricingStepSchema = z.object({
  tables: z.array(PricingTablePayloadSchema).optional(),
});

export const UploadNotesSchema = z.object({
  contractNotes: z.string().max(2000).optional().default(""),
  proposalNotes: z.string().max(2000).optional().default(""),
});

export const StepUpdateSchema = z.object({
  stepIndex: z.coerce.number().int().min(0),
  data: z.any(),
  currentStep: z.coerce.number().int().min(0).optional(),
});

export const SubmitSchema = z.object({
  confirm: z.literal(true),
});
