export type Role = "ADMIN" | "CLIENT";
export type FormStatus = "RASCUNHO" | "ENVIADO";
export type Regime = "SIMPLES" | "PRESUMIDO" | "REAL";
export type UploadType =
  | "CONTRATO"
  | "PROPOSTA"
  | "RELACAO_CLIENTES"
  | "ETAPA2_RELATORIO_CONTRATOS"
  | "ETAPA2_RELATORIO_HONORARIOS";
export type UploadStatus = "NAO_ENVIADO" | "ENVIADO" | "EM_ANALISE" | "AJUSTE_NECESSARIO" | "VALIDADO" | "SUBSTITUIDO" | "EXCLUIDO_ADMIN";
export type StageTwoFileStatus = "ENVIADO" | "EM_ANALISE" | "AJUSTE_NECESSARIO" | "VALIDADO" | "SUBSTITUIDO";
export type StageThreeIntegrationStatus =
  | "AGUARDANDO_DADOS"
  | "DADOS_ENVIADOS"
  | "EM_CONFIGURACAO"
  | "AJUSTE_NECESSARIO"
  | "CONFIGURADA";
export type StageStatus =
  | "NAO_INICIADA"
  | "EM_PREENCHIMENTO"
  | "ENVIADA_PELO_CLIENTE"
  | "EM_ANALISE_IMPLANTACAO"
  | "AJUSTE_NECESSARIO"
  | "TREINAMENTO_AGENDADO"
  | "TREINAMENTO_REALIZADO"
  | "AGUARDANDO_ACEITE_CONCLUSAO"
  | "CONCLUIDA"
  | "PROXIMA_ETAPA_DISPONIVEL";
export type AppointmentStatus =
  | "NAO_DISPONIVEL"
  | "DISPONIVEL_AGENDAMENTO"
  | "RESERVADO"
  | "CONFIRMADO_EQUIPE"
  | "REAGENDADO"
  | "REALIZADO"
  | "CANCELADO";
export type ScheduleSlotStatus = "DISPONIVEL" | "OCUPADO" | "NAO_DISPONIVEL";
export type FileLogAction =
  | "UPLOAD"
  | "DOWNLOAD"
  | "VALIDACAO"
  | "SOLICITACAO_AJUSTE"
  | "SUBSTITUICAO"
  | "EXCLUSAO_ADMIN"
  | "VISUALIZACAO_MODELO"
  | "DOWNLOAD_MODELO"
  | "CIENCIA_CONTRATO";

export type Sector = "COMERCIO" | "SERVICOS" | "INDUSTRIA" | "NAO_SEI";

export type PricingRow = {
  faixaId: string;
  faixaLabel: string;
  value: number;
};

export type Appointment = {
  id: string;
  formId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  createdByUserId: string;
  externalCalendarProvider?: string | null;
  externalCalendarEventId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  form?: {
    id: string;
    userId: string;
    user?: {
      id?: string;
      name: string;
      email: string;
      role?: Role;
    } | null;
  } | null;
};

export type StageAcceptance = {
  id: string;
  formId: string;
  stageKey: string;
  status: string;
  version: number;
  summarySnapshot: string;
  acceptedByUserId: string;
  acceptedAt: string;
  createdAt: string;
  acceptedByUser?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
};

export type ScheduleSlot = {
  startAt: string;
  endAt: string;
  label: string;
  dateKey: string;
  dateLabel: string;
  status: ScheduleSlotStatus;
  available: boolean;
};

export type ScheduleAvailabilityDay = {
  dateKey: string;
  dateLabel: string;
  slots: ScheduleSlot[];
};

export type FileLog = {
  id: string;
  formId: string;
  uploadId?: string | null;
  userId?: string | null;
  type: UploadType;
  action: FileLogAction;
  status: UploadStatus;
  message?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
};

export type ImplementationLog = {
  id: string;
  formId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata: any;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
};

export type Upload = {
  id: string;
  formId: string;
  type: UploadType;
  filename: string;
  mimetype: string;
  size: number;
  status: UploadStatus;
  createdAt: string;
  updatedAt?: string;
  logs?: FileLog[];
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
  currentStageKey?: "ETAPA_01" | "ETAPA_02" | "ETAPA_03";
  stageStatus?: StageStatus | string;
  trainingStatus?: AppointmentStatus | string;
  stepData: any;
  createdAt: string;
  updatedAt: string;
  pricing: PricingTable[];
  uploads: Upload[];
  appointment?: Appointment | null;
  fileLogs?: FileLog[];
  implementationLogs?: ImplementationLog[];
  stageAcceptances?: StageAcceptance[];
  user?: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  history?: { id: string; stepIndex: number; savedAt: string }[];
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};
