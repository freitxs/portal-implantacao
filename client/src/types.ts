export type Role = "ADMIN" | "CLIENT";
export type FormStatus = "RASCUNHO" | "ENVIADO";
export type Regime = "SIMPLES" | "PRESUMIDO" | "REAL";
export type UploadType = "CONTRATO" | "PROPOSTA";

export type Sector = "COMERCIO" | "SERVICOS" | "INDUSTRIA" | "NAO_SEI";

export type PricingRow = {
  faixaId: string;
  faixaLabel: string;
  value: number;
};

export type Upload = {
  id: string;
  formId: string;
  type: UploadType;
  filename: string;
  mimetype: string;
  size: number;
  createdAt: string;
};

export type PricingTable = {
  id: string;
  formId: string;
  regime: Regime;
  sector: Sector;
  rows: PricingRow[];
};

export type OnboardingForm = {
  id: string;
  userId: string;
  status: FormStatus;
  currentStep: number;
  stepData: any;
  createdAt: string;
  updatedAt: string;
  pricing: PricingTable[];
  uploads: Upload[];
  history?: { id: string; stepIndex: number; savedAt: string }[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
