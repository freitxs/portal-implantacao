import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { createImplementationLog } from "../lib/implementationLogs.js";
import { requireAuth } from "../middlewares/auth.js";
import { storage as localStorage } from "../lib/storage.js";

const router = Router();

const FILE_STATUS = {
  NAO_ENVIADO: "NAO_ENVIADO",
  ENVIADO: "ENVIADO",
  EM_ANALISE: "EM_ANALISE",
  AJUSTE_NECESSARIO: "AJUSTE_NECESSARIO",
  VALIDADO: "VALIDADO",
  SUBSTITUIDO: "SUBSTITUIDO",
  EXCLUIDO_ADMIN: "EXCLUIDO_ADMIN",
} as const;

const UPLOAD_TYPES = ["CONTRATO", "PROPOSTA", "RELACAO_CLIENTES", "ETAPA2_RELATORIO_CONTRATOS", "ETAPA2_RELATORIO_HONORARIOS"] as const;
const uploadTypeSchema = z.enum(UPLOAD_TYPES);
const ADMIN_ACTIONS = ["VALIDADO", "AJUSTE_NECESSARIO", "EXCLUIDO_ADMIN"] as const;
const adminStatusSchema = z.enum(ADMIN_ACTIONS);

const MAX_SIZE = 10 * 1024 * 1024;
const standardDocumentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const clientListMimeTypes = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const currentFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFilePath), "../../..");

const proposalModelSuggestions = [
  {
    id: "honorarium-proposta-corporativa-azul",
    name: "Modelo Corporativo Azul",
    description: "Modelo institucional de proposta comercial Honorarium.",
    filename: "Proposta Comercial Corporativa - Azul (1).pdf",
    filepath: path.resolve(projectRoot, "client/public/templates/propostas/proposta-corporativa-azul.pdf"),
  },
  {
    id: "honorarium-proposta-corporativa-azul-escuro",
    name: "Modelo Corporativo Azul Escuro",
    description: "Variação institucional de proposta comercial Honorarium.",
    filename: "Proposta Corporativa (Variação 2) Azul Escuro (1).pdf",
    filepath: path.resolve(projectRoot, "client/public/templates/propostas/proposta-corporativa-azul-escuro.pdf"),
  },
] as const;

const contractStandardFile = {
  id: "honorarium-contrato-padrao",
  name: "Contrato padrão Honorarium",
  description: "Modelo editável de contrato de prestação de serviços contábeis consultivos.",
  filename: "contrato-honorarium-padrao.pdf",
  filepath: path.resolve(projectRoot, "client/public/templates/contratos/contrato-honorarium-padrao.pdf"),
} as const;

const stageTwoInstructionsText = [
  "ETAPA 02 - PAINEIS E HISTORICO",
  "",
  "1. Baixe os modelos e as instruções desta etapa.",
  "2. Extraia os relatórios iniciais a partir da rotina contábil já utilizada pelo escritório.",
  "3. Envie os arquivos nos locais indicados para análise da equipe Honorarium.",
  "4. A equipe Honorarium organiza, valida e configura os painéis de Contratos e Honorários.",
].join("\n");

function normalizeUpload(upload: any) {
  return {
    ...upload,
    logs: Array.isArray(upload?.logs) ? upload.logs : [],
  };
}

function canAccessForm(user: { id: string; role: "ADMIN" | "CLIENT" }, form: { userId: string }) {
  return user.role === "ADMIN" || form.userId === user.id;
}

function ensureClient(user: { role: "ADMIN" | "CLIENT" }) {
  return user.role === "CLIENT";
}

function ensureAdmin(user: { role: "ADMIN" | "CLIENT" }) {
  return user.role === "ADMIN";
}

function getAcceptedMimeTypes(type: z.infer<typeof uploadTypeSchema>) {
  if (type === "RELACAO_CLIENTES" || type === "ETAPA2_RELATORIO_CONTRATOS" || type === "ETAPA2_RELATORIO_HONORARIOS") return clientListMimeTypes;
  return standardDocumentMimeTypes;
}

function getAcceptedLabel(type: z.infer<typeof uploadTypeSchema>) {
  if (type === "RELACAO_CLIENTES" || type === "ETAPA2_RELATORIO_CONTRATOS" || type === "ETAPA2_RELATORIO_HONORARIOS") return "CSV/XLSX";
  return "PDF/DOC/DOCX";
}

function findProposalModel(modelId: string) {
  return proposalModelSuggestions.find((item) => item.id === modelId) ?? null;
}

function assertFileExists(filepath: string) {
  return fs.existsSync(filepath);
}

async function createFileLog(params: {
  formId: string;
  uploadId?: string | null;
  userId?: string | null;
  type: z.infer<typeof uploadTypeSchema>;
  action: string;
  status: string;
  message?: string;
}) {
  return prisma.fileLog.create({
    data: {
      formId: params.formId,
      uploadId: params.uploadId ?? null,
      userId: params.userId ?? null,
      type: params.type,
      action: params.action,
      status: params.status,
      message: params.message,
    },
  });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const formId = req.params.id;
      const dir = localStorage.ensureFormDir(formId);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, localStorage.buildFilename(file.originalname));
    },
  }),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const parsed = uploadTypeSchema.safeParse(req.params.type);
    if (!parsed.success) {
      return cb(new Error("Tipo de arquivo inválido."));
    }
    if (!getAcceptedMimeTypes(parsed.data).has(file.mimetype)) {
      return cb(new Error(`Tipo de arquivo inválido. Envie ${getAcceptedLabel(parsed.data)}.`));
    }
    cb(null, true);
  },
});

router.get("/forms/:id/summary", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: {
        uploads: { include: { logs: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } } } },
        fileLogs: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" }, take: 200 },
      },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    res.json({
      uploads: (form.uploads ?? []).map(normalizeUpload),
      fileLogs: form.fileLogs ?? [],
      proposalModelSuggestions: proposalModelSuggestions.map(({ filepath, ...item }) => item),
      contractStandard: {
        id: contractStandardFile.id,
        name: contractStandardFile.name,
        description: contractStandardFile.description,
        filename: contractStandardFile.filename,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.get("/proposal-models", requireAuth, async (_req, res) => {
  res.json({
    models: proposalModelSuggestions.map(({ filepath, ...item }) => item),
  });
});

router.get("/forms/:id/proposal-models/:modelId/view", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const model = findProposalModel(req.params.modelId);
    if (!model || !assertFileExists(model.filepath)) return res.status(404).json({ message: "Modelo não encontrado." });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "PROPOSTA",
      action: "VISUALIZACAO_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: `Visualização do modelo de proposta: ${model.name}.`,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "VISUALIZACAO_MODELO_PROPOSTA",
      entityType: "PROPOSAL_TEMPLATE",
      entityId: model.id,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        filename: model.filename,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(model.filename)}"`);
    res.sendFile(model.filepath);
  } catch (e) {
    next(e);
  }
});

router.post("/forms/:id/proposal-models/:modelId/viewed", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const model = findProposalModel(req.params.modelId);
    if (!model || !assertFileExists(model.filepath)) return res.status(404).json({ message: "Modelo não encontrado." });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "PROPOSTA",
      action: "VISUALIZACAO_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: `Visualização do modelo de proposta: ${model.name}.`,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "VISUALIZACAO_MODELO_PROPOSTA",
      entityType: "PROPOSAL_TEMPLATE",
      entityId: model.id,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        filename: model.filename,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id/proposal-models/:modelId/download", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const model = findProposalModel(req.params.modelId);
    if (!model || !assertFileExists(model.filepath)) return res.status(404).json({ message: "Modelo não encontrado." });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "PROPOSTA",
      action: "DOWNLOAD_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: `Download do modelo de proposta: ${model.name}.`,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "DOWNLOAD_MODELO_PROPOSTA",
      entityType: "PROPOSAL_TEMPLATE",
      entityId: model.id,
      metadata: {
        modelId: model.id,
        modelName: model.name,
        filename: model.filename,
      },
    });

    res.download(model.filepath, model.filename);
  } catch (e) {
    next(e);
  }
});

router.get("/contract-standard/view", requireAuth, async (_req, res) => {
  res.json({
    title: contractStandardFile.name,
    description: contractStandardFile.description,
    filename: contractStandardFile.filename,
  });
});

router.get("/forms/:id/contract-standard/view", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (!assertFileExists(contractStandardFile.filepath)) return res.status(404).json({ message: "Contrato padrão indisponível." });

    const currentStepData = typeof form.stepData === "string" ? JSON.parse(form.stepData || "{}") : form.stepData ?? {};
    const nextStepData = {
      ...currentStepData,
      uploads: {
        ...(currentStepData.uploads ?? {}),
        noContractTemplate: true,
        contractStandardViewedAt: new Date().toISOString(),
      },
    };

    await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { stepData: JSON.stringify(nextStepData) },
    });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "CONTRATO",
      action: "VISUALIZACAO_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: "Visualização do contrato padrão Honorarium.",
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "VISUALIZACAO_CONTRATO_PADRAO",
      entityType: "CONTRATO_PADRAO",
      metadata: {
        filename: contractStandardFile.filename,
        viewedAt: nextStepData.uploads.contractStandardViewedAt,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(contractStandardFile.filename)}"`);
    res.sendFile(contractStandardFile.filepath);
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id/templates/relacao-clientes", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    const templatePath = path.resolve(projectRoot, "client/public/templates/relacao-clientes-modelo.xlsx");
    if (!assertFileExists(templatePath)) return res.status(404).json({ message: "Modelo de relação de clientes indisponível." });
    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "RELACAO_CLIENTES",
      action: "DOWNLOAD_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: "Download do modelo atualizado da relação de clientes.",
    });

    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "DOWNLOAD_MODELO_RELEVANTE",
      entityType: "UPLOAD_TEMPLATE",
      metadata: {
        type: "RELACAO_CLIENTES",
        label: "Modelo atualizado da relação de clientes",
      },
    });
    res.download(templatePath, "Planilha Modelo - Importacao de Empresas.xlsx");
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id/stage-two/instructions", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "DOWNLOAD_MODELO_RELEVANTE",
      entityType: "UPLOAD_TEMPLATE",
      metadata: {
        label: "Instruções da Etapa 02",
      },
    });

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=etapa-02-instrucoes.txt");
    res.send(stageTwoInstructionsText);
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id/stage-two/templates/:kind", requireAuth, async (req, res, next) => {
  try {
    const kind = z.enum(["contratos", "honorarios"]).parse(req.params.kind);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const csv =
      kind === "contratos"
        ? ["Cliente,Contrato,Data inicial,Valor mensal,Status", ",,,,"].join("\n")
        : ["Cliente,Honorário atual,Faixa,Observação", ",,,"].join("\n");

    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "DOWNLOAD_MODELO_RELEVANTE",
      entityType: "UPLOAD_TEMPLATE",
      metadata: {
        type: kind === "contratos" ? "ETAPA2_RELATORIO_CONTRATOS" : "ETAPA2_RELATORIO_HONORARIOS",
        label: kind === "contratos" ? "Modelo da Etapa 02 - Painel de Contratos" : "Modelo da Etapa 02 - Painel de Honorários",
      },
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=etapa-02-${kind}-modelo.csv`);
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

router.post("/forms/:id/templates/proposal-selection", requireAuth, async (req, res, next) => {
  try {
    if (!ensureClient(req.user!)) return res.status(403).json({ message: "Sem permissão." });
    const body = z
      .object({
        selectedModelId: z.string().min(1),
        noOwnModel: z.boolean().default(false),
      })
      .parse(req.body);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const model = findProposalModel(body.selectedModelId);
    if (!model) return res.status(404).json({ message: "Modelo de proposta não encontrado." });

    const currentStepData = typeof form.stepData === "string" ? JSON.parse(form.stepData || "{}") : form.stepData ?? {};
    const nextStepData = {
      ...currentStepData,
      uploads: {
        ...(currentStepData.uploads ?? {}),
        noProposalTemplate: body.noOwnModel,
        selectedProposalTemplateId: model.id,
        selectedProposalTemplateName: model.name,
        selectedProposalTemplateFilename: model.filename,
        selectedProposalTemplatePath: `/templates/propostas/${path.basename(model.filepath)}`,
      },
    };

    await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { stepData: JSON.stringify(nextStepData) },
    });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "PROPOSTA",
      action: "VALIDACAO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: `Modelo Honorarium escolhido: ${model.name}.`,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "ESCOLHA_MODELO_PROPOSTA",
      entityType: "PROPOSAL_TEMPLATE",
      entityId: model.id,
      metadata: {
        selectedModelId: model.id,
        selectedModelName: model.name,
        selectedModelFilename: model.filename,
        noOwnModel: body.noOwnModel,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/forms/:id/contract-standard/viewed", requireAuth, async (req, res, next) => {
  try {
    if (!ensureClient(req.user!)) return res.status(403).json({ message: "Sem permissão." });
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const currentStepData = typeof form.stepData === "string" ? JSON.parse(form.stepData || "{}") : form.stepData ?? {};
    const nextStepData = {
      ...currentStepData,
      uploads: {
        ...(currentStepData.uploads ?? {}),
        noContractTemplate: true,
        contractStandardFilename: contractStandardFile.filename,
        contractStandardViewedAt: new Date().toISOString(),
      },
    };

    await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { stepData: JSON.stringify(nextStepData) },
    });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "CONTRATO",
      action: "VISUALIZACAO_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: "Visualização do contrato padrão Honorarium.",
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "VISUALIZACAO_CONTRATO_PADRAO",
      entityType: "CONTRATO_PADRAO",
      metadata: {
        filename: contractStandardFile.filename,
        viewedAt: nextStepData.uploads.contractStandardViewedAt,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/forms/:id/contract-standard/acknowledge", requireAuth, async (req, res, next) => {
  try {
    if (!ensureClient(req.user!)) return res.status(403).json({ message: "Sem permissão." });
    const body = z.object({ acknowledged: z.literal(true) }).parse(req.body);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const currentStepData = typeof form.stepData === "string" ? JSON.parse(form.stepData || "{}") : form.stepData ?? {};
    const uploadsState = currentStepData.uploads ?? {};
    if (!uploadsState.contractStandardViewedAt) {
      return res.status(400).json({ message: "Visualize ou baixe o contrato padrão antes de registrar a ciência." });
    }

    const nextStepData = {
      ...currentStepData,
      uploads: {
        ...uploadsState,
        noContractTemplate: true,
        contractStandardFilename: contractStandardFile.filename,
        contractAcknowledged: body.acknowledged,
        contractAcknowledgedAt: new Date().toISOString(),
      },
    };

    await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { stepData: JSON.stringify(nextStepData) },
    });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "CONTRATO",
      action: "CIENCIA_CONTRATO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: "Ciência registrada para uso do contrato padrão Honorarium.",
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "ACEITE_CONTRATO_PADRAO_HONORARIUM",
      entityType: "CONTRATO_PADRAO",
      metadata: {
        acknowledgedAt: nextStepData.uploads.contractAcknowledgedAt,
      },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id/contract-standard/download", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (!assertFileExists(contractStandardFile.filepath)) return res.status(404).json({ message: "Contrato padrão indisponível." });

    const currentStepData = typeof form.stepData === "string" ? JSON.parse(form.stepData || "{}") : form.stepData ?? {};
    const nextStepData = {
      ...currentStepData,
      uploads: {
        ...(currentStepData.uploads ?? {}),
        noContractTemplate: true,
        contractStandardFilename: contractStandardFile.filename,
        contractStandardDownloadedAt: new Date().toISOString(),
      },
    };

    await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { stepData: JSON.stringify(nextStepData) },
    });

    await createFileLog({
      formId: form.id,
      userId: req.user!.id,
      type: "CONTRATO",
      action: "DOWNLOAD_MODELO",
      status: FILE_STATUS.NAO_ENVIADO,
      message: "Download do contrato padrão Honorarium.",
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "DOWNLOAD_CONTRATO_PADRAO",
      entityType: "CONTRATO_PADRAO",
      metadata: {
        filename: contractStandardFile.filename,
        downloadedAt: nextStepData.uploads.contractStandardDownloadedAt,
      },
    });

    res.download(contractStandardFile.filepath, contractStandardFile.filename);
  } catch (e) {
    next(e);
  }
});

router.post("/:id/uploads/:type", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const type = uploadTypeSchema.parse(req.params.type);
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: { uploads: true },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (!req.file) return res.status(400).json({ message: "Arquivo não enviado." });

    const existing = form.uploads.find((item) => item.type === type);
    let uploadRecord: any;
    const action = existing ? "SUBSTITUICAO" : "UPLOAD";
    const actionStatus = existing ? FILE_STATUS.SUBSTITUIDO : FILE_STATUS.ENVIADO;

    if (existing) {
      try {
        if (existing.path && fs.existsSync(existing.path)) fs.unlinkSync(existing.path);
      } catch {}

      uploadRecord = await prisma.upload.update({
        where: { formId_type: { formId: form.id, type } },
        data: {
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size,
          status: FILE_STATUS.ENVIADO,
        },
        include: { logs: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } } },
      });
    } else {
      uploadRecord = await prisma.upload.create({
        data: {
          formId: form.id,
          type,
          filename: req.file.originalname,
          path: req.file.path,
          mimetype: req.file.mimetype,
          size: req.file.size,
          status: FILE_STATUS.ENVIADO,
        },
        include: { logs: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } } },
      });
    }

    await createFileLog({
      formId: form.id,
      uploadId: uploadRecord.id,
      userId: req.user!.id,
      type,
      action,
      status: actionStatus,
      message: `${req.file.originalname} enviado por ${req.user!.role === "ADMIN" ? "admin" : "cliente"}.`,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: existing ? "ENVIO_NOVA_VERSAO_ARQUIVO" : "UPLOAD_ARQUIVO",
      entityType: "UPLOAD",
      entityId: uploadRecord.id,
      metadata: {
        type,
        filename: req.file.originalname,
        status: uploadRecord.status,
      },
    });

    res.json({ upload: normalizeUpload(uploadRecord) });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/uploads/:type/status", requireAuth, async (req, res, next) => {
  try {
    if (!ensureAdmin(req.user!)) return res.status(403).json({ message: "Sem permissão." });
    const type = uploadTypeSchema.parse(req.params.type);
    const body = z.object({ status: adminStatusSchema, message: z.string().max(500).optional() }).parse(req.body);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const uploadRecord = await prisma.upload.findUnique({ where: { formId_type: { formId: form.id, type } } });
    if (!uploadRecord) return res.status(404).json({ message: "Arquivo não encontrado." });

    const updated = await prisma.upload.update({
      where: { id: uploadRecord.id },
      data: { status: body.status },
      include: { logs: { include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { createdAt: "desc" } } },
    });

    await createFileLog({
      formId: form.id,
      uploadId: uploadRecord.id,
      userId: req.user!.id,
      type,
      action: body.status === FILE_STATUS.VALIDADO ? "VALIDACAO" : body.status === FILE_STATUS.AJUSTE_NECESSARIO ? "SOLICITACAO_AJUSTE" : "EXCLUSAO_ADMIN",
      status: body.status,
      message: body.message,
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: body.status === FILE_STATUS.VALIDADO ? "VALIDACAO_ARQUIVO" : body.status === FILE_STATUS.AJUSTE_NECESSARIO ? "SOLICITACAO_AJUSTE_ARQUIVO" : "EXCLUSAO_ADMINISTRATIVA_ARQUIVO",
      entityType: "UPLOAD",
      entityId: uploadRecord.id,
      metadata: {
        type,
        status: body.status,
        message: body.message ?? null,
      },
    });

    res.json({ upload: normalizeUpload(updated) });
  } catch (e) {
    next(e);
  }
});

router.delete("/:id/uploads/:type", requireAuth, async (req, res, next) => {
  try {
    if (!ensureAdmin(req.user!)) return res.status(403).json({ message: "Sem permissão." });
    const type = uploadTypeSchema.parse(req.params.type);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const existing = await prisma.upload.findUnique({ where: { formId_type: { formId: form.id, type } } });
    if (!existing) return res.json({ ok: true });

    try {
      if (existing.path && fs.existsSync(existing.path)) fs.unlinkSync(existing.path);
    } catch {}

    await prisma.upload.update({
      where: { id: existing.id },
      data: {
        status: FILE_STATUS.EXCLUIDO_ADMIN,
        filename: "",
        path: "",
        mimetype: "",
        size: 0,
      },
    });

    await createFileLog({
      formId: form.id,
      uploadId: existing.id,
      userId: req.user!.id,
      type,
      action: "EXCLUSAO_ADMIN",
      status: FILE_STATUS.EXCLUIDO_ADMIN,
      message: "Arquivo removido administrativamente.",
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "EXCLUSAO_ADMINISTRATIVA_ARQUIVO",
      entityType: "UPLOAD",
      entityId: existing.id,
      metadata: { type },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/download/:uploadId", requireAuth, async (req, res, next) => {
  try {
    const uploadId = req.params.uploadId;
    const uploadRecord = await prisma.upload.findUnique({
      where: { id: uploadId },
      include: { form: true },
    });
    if (!uploadRecord) return res.status(404).json({ message: "Arquivo não encontrado." });
    if (!canAccessForm(req.user!, uploadRecord.form)) return res.status(403).json({ message: "Sem permissão." });
    if (!uploadRecord.path || uploadRecord.status === FILE_STATUS.EXCLUIDO_ADMIN) {
      return res.status(404).json({ message: "Arquivo indisponível." });
    }

    await createFileLog({
      formId: uploadRecord.formId,
      uploadId: uploadRecord.id,
      userId: req.user!.id,
      type: uploadRecord.type as z.infer<typeof uploadTypeSchema>,
      action: "DOWNLOAD",
      status: uploadRecord.status,
      message: `Download do arquivo ${uploadRecord.filename}.`,
    });

    await createImplementationLog({
      formId: uploadRecord.formId,
      userId: req.user!.id,
      action: "DOWNLOAD_ARQUIVO",
      entityType: "UPLOAD",
      entityId: uploadRecord.id,
      metadata: {
        type: uploadRecord.type,
        filename: uploadRecord.filename,
        status: uploadRecord.status,
      },
    });

    res.download(path.resolve(uploadRecord.path), uploadRecord.filename);
  } catch (e) {
    next(e);
  }
});

export default router;
