import { Router } from "express";
import { z } from "zod";
import { parseImplementationLog } from "../lib/implementationLogs.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { hashPassword } from "../lib/password.js";
import { stringify } from "../utils/csv.js";

const router = Router();

function safeJsonParse<T>(value: any, fallback: T): T {
  try {
    if (value == null) return fallback;
    if (typeof value === "string") return JSON.parse(value) as T;
    return value as T;
  } catch {
    return fallback;
  }
}

function getStageSummary(form: any) {
  const stepData = safeJsonParse<any>(form.stepData, {});
  const appointment = form.appointment ?? null;
  const uploads = Array.isArray(form.uploads) ? form.uploads : [];
  const stage2Uploads = uploads.filter((upload: any) => ["ETAPA2_RELATORIO_CONTRATOS", "ETAPA2_RELATORIO_HONORARIOS"].includes(upload.type) && upload.status !== "EXCLUIDO_ADMIN");
  const stage3Integrations = Array.isArray(stepData.stage3?.integrations) ? stepData.stage3.integrations : [];
  const stage01Completed = stepData.stage01Completion?.status === "CONCLUIDA";
  const stage02Released = Boolean(stage01Completed && stepData.stageAccess?.stage2Released);
  const stage02Completed = stepData.stage02?.status === "CONCLUIDA" || Boolean(stage02Released && stepData.stageAccess?.stage3Released);
  const stage03Released = Boolean(stage02Completed && stepData.stageAccess?.stage3Released);
  const stage03Completed = stepData.stage03?.status === "CONCLUIDA";
  const reviewConfirmed = Boolean(stepData.review?.confirmedAt);
  const hasAdjustment =
    uploads.some((upload: any) => upload.status === "AJUSTE_NECESSARIO") ||
    stage3Integrations.some((integration: any) => integration?.status === "AJUSTE_NECESSARIO");

  let currentStageKey = "ETAPA_01";
  if (stage03Released || stage03Completed) currentStageKey = "ETAPA_03";
  else if (stage02Released || stage02Completed) currentStageKey = "ETAPA_02";

  let stageStatus = "NAO_INICIADA";
  if (stage03Completed) stageStatus = "CONCLUIDA";
  else if (stage03Released) {
    if (stage3Integrations.some((integration: any) => integration?.status === "AJUSTE_NECESSARIO")) stageStatus = "AJUSTE_NECESSARIO";
    else if (stage3Integrations.some((integration: any) => integration?.status === "EM_CONFIGURACAO")) stageStatus = "EM_ANALISE_IMPLANTACAO";
    else if (stage3Integrations.some((integration: any) => integration?.status === "DADOS_ENVIADOS")) stageStatus = "ENVIADA_PELO_CLIENTE";
    else stageStatus = "PROXIMA_ETAPA_DISPONIVEL";
  } else if (stage02Completed) stageStatus = "CONCLUIDA";
  else if (stage02Released) {
    if (stage2Uploads.some((upload: any) => upload.status === "AJUSTE_NECESSARIO")) stageStatus = "AJUSTE_NECESSARIO";
    else if (stage2Uploads.some((upload: any) => ["EM_ANALISE", "VALIDADO", "SUBSTITUIDO"].includes(upload.status))) stageStatus = "EM_ANALISE_IMPLANTACAO";
    else if (stage2Uploads.some((upload: any) => upload.status === "ENVIADO")) stageStatus = "ENVIADA_PELO_CLIENTE";
    else stageStatus = "PROXIMA_ETAPA_DISPONIVEL";
  } else if (stage01Completed) stageStatus = "CONCLUIDA";
  else if (appointment?.status === "REALIZADO") stageStatus = "TREINAMENTO_REALIZADO";
  else if (appointment?.status === "CONFIRMADO_EQUIPE") stageStatus = "AGUARDANDO_ACEITE_CONCLUSAO";
  else if (appointment && ["RESERVADO", "REAGENDADO"].includes(appointment.status)) stageStatus = "TREINAMENTO_AGENDADO";
  else if (hasAdjustment) stageStatus = "AJUSTE_NECESSARIO";
  else if (form.status === "ENVIADO") stageStatus = "EM_ANALISE_IMPLANTACAO";
  else if (reviewConfirmed) stageStatus = "ENVIADA_PELO_CLIENTE";
  else if (form.currentStep >= 1) stageStatus = "EM_PREENCHIMENTO";

  let trainingStatus = "NAO_DISPONIVEL";
  if (appointment) trainingStatus = appointment.status;
  else if (reviewConfirmed) trainingStatus = "DISPONIVEL_AGENDAMENTO";

  return {
    currentStageKey,
    stageStatus,
    trainingStatus,
    needsAcceptance: Boolean(appointment && ["CONFIRMADO_EQUIPE", "REALIZADO"].includes(appointment.status) && !stage01Completed),
    hasAdjustment,
  };
}

router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res, next) => {
  try {
    const [forms, appointments] = await Promise.all([
      prisma.onboardingForm.findMany({
        include: {
          uploads: { select: { type: true, status: true } },
          appointment: { select: { status: true, startAt: true, endAt: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { status: { in: ["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO"] } },
        select: { id: true },
      }),
    ]);

    const summaries = forms.map((form) => getStageSummary(form));
    const awaitingAnalysis = summaries.filter((summary) => summary.stageStatus === "EM_ANALISE_IMPLANTACAO" || summary.stageStatus === "ENVIADA_PELO_CLIENTE").length;
    const acceptancesPending = summaries.filter((summary) => summary.needsAcceptance).length;
    const adjustmentsNeeded = summaries.filter((summary) => summary.hasAdjustment || summary.stageStatus === "AJUSTE_NECESSARIO").length;

    res.json({
      stats: {
        clientsInTrail: forms.length,
        awaitingAnalysis,
        trainingsReserved: appointments.length,
        acceptancesPending,
        adjustmentsNeeded,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      role: z.enum(["ADMIN", "CLIENT"]).default("CLIENT"),
    });
    const body = schema.parse(req.body);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash: await hashPassword(body.password),
        role: body.role,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    res.json({ user });
  } catch (e) {
    next(e);
  }
});

router.get("/forms", async (req, res, next) => {
  try {
    const qSchema = z.object({
      status: z.enum(["RASCUNHO", "ENVIADO"]).optional(),
      search: z.string().optional(),
      currentStage: z.enum(["ETAPA_01", "ETAPA_02", "ETAPA_03"]).optional(),
      trainingStatus: z.enum(["NAO_DISPONIVEL", "DISPONIVEL_AGENDAMENTO", "RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO", "REALIZADO", "CANCELADO"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(5).max(100).default(20),
    });
    const q = qSchema.parse(req.query);

    const where: any = {};
    if (q.status) where.status = q.status;

    if (q.search) {
      where.OR = [
        { user: { name: { contains: q.search, mode: "insensitive" } } },
        { stepData: { contains: q.search } },
      ];
    }

    const forms = await prisma.onboardingForm.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        uploads: { select: { type: true, status: true, filename: true, createdAt: true, updatedAt: true } },
        appointment: {
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            updatedAt: true,
            createdAt: true,
            formId: true,
            createdByUserId: true,
          },
        },
        stageAcceptances: {
          select: { id: true, stageKey: true, status: true, version: true, acceptedAt: true, createdAt: true, acceptedByUserId: true },
          orderBy: { acceptedAt: "desc" },
          take: 5,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const normalized = (forms as any[]).map((form) => {
      const normalizedForm = { ...form, stepData: safeJsonParse(form.stepData, {}) };
      const summary = getStageSummary(normalizedForm);
      return { ...normalizedForm, ...summary };
    });

    const filtered = normalized.filter((form) => {
      if (q.currentStage && form.currentStageKey !== q.currentStage) return false;
      if (q.trainingStatus && form.trainingStatus !== q.trainingStatus) return false;
      return true;
    });

    const total = filtered.length;
    const start = (q.page - 1) * q.pageSize;
    const paginated = filtered.slice(start, start + q.pageSize);

    res.json({ total, page: q.page, pageSize: q.pageSize, forms: paginated });
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id", async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { name: true, email: true } },
        pricing: true,
        uploads: {
          include: {
            logs: {
              include: { user: { select: { id: true, name: true, email: true, role: true } } },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        fileLogs: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 200,
        },
        implementationLogs: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" },
          take: 300,
        },
        history: { orderBy: { savedAt: "desc" }, take: 200 },
        appointment: {
          include: {
            createdByUser: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        stageAcceptances: {
          include: {
            acceptedByUser: { select: { id: true, name: true, email: true, role: true } },
          },
          orderBy: { acceptedAt: "desc" },
          take: 20,
        },
      },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const normalized = {
      ...form,
      stepData: safeJsonParse(form.stepData, {}),
      pricing: (form.pricing ?? []).map((pricing: any) => ({ ...pricing, rows: safeJsonParse(pricing.rows, []) })),
      implementationLogs: (form.implementationLogs ?? []).map(parseImplementationLog),
    };

    res.json({ form: normalized });
  } catch (e) {
    next(e);
  }
});

router.get("/forms.csv", async (_req, res, next) => {
  try {
    const forms = await prisma.onboardingForm.findMany({
      include: { user: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    });

    const rows = forms.map((form) => {
      const data = safeJsonParse<any>(form.stepData, {});
      const page1 = data?.page1 ?? {};
      const page2 = data?.page2 ?? {};
      return {
        id: form.id,
        status: form.status,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
        userName: form.user?.name ?? "",
        userEmail: form.user?.email ?? "",
        systemsJson: JSON.stringify(page1?.systems ?? {}),
        pricingFactors: (page2?.pricingFactors ?? []).join("; "),
        expectation: String(page2?.expectation ?? ""),
      };
    });

    const csv = stringify(rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=forms.csv");
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id.csv", async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const data = safeJsonParse<any>(form.stepData, {});
    const csv = stringify([
      {
        id: form.id,
        status: form.status,
        createdAt: form.createdAt.toISOString(),
        updatedAt: form.updatedAt.toISOString(),
        userName: form.user?.name ?? "",
        userEmail: form.user?.email ?? "",
        stepData: JSON.stringify(data),
      },
    ]);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=form.csv");
    res.send(csv);
  } catch (e) {
    next(e);
  }
});

router.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    res.json({ users });
  } catch (e) {
    next(e);
  }
});

export default router;
