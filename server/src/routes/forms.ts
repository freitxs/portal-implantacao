import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { StepUpdateSchema, SubmitSchema } from "../schemas/forms.js";

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

function safeJsonStringify(value: any, fallback: string) {
  try {
    return JSON.stringify(value ?? safeJsonParse(fallback, {}));
  } catch {
    return fallback;
  }
}

function canAccessForm(user: any, form: any) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return form.userId === user.id;
}

// 🔎 As tabelas de precificação (PricingTable) continuam no banco (para evoluções futuras),
// mas a jornada atual é baseada nas perguntas do documento "Sistemas que utiliza".

/**
 * ✅ LISTA "MEUS FORMULÁRIOS"
 * GET /api/forms/my
 */
router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const forms = await prisma.onboardingForm.findMany({
      where: { userId: req.user!.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, status: true, createdAt: true, updatedAt: true, currentStep: true },
    });
    res.json({ forms });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/copy", requireAuth, async (req, res, next) => {
  try {
    const original = await prisma.onboardingForm.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!original) return res.status(404).json({ message: "Formulário não encontrado." });

    const created = await prisma.onboardingForm.create({
      data: {
        userId: req.user!.id,
        status: "RASCUNHO",
        currentStep: 0,
        stepData: original.stepData ?? "{}",
      },
      select: { id: true },
    });

    res.json({ formId: created.id });
  } catch (e) {
    next(e);
  }
});

// Create or reuse draft
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.onboardingForm.findFirst({
      where: { userId: req.user!.id, status: "RASCUNHO" },
      orderBy: { updatedAt: "desc" },
    });
    if (existing) return res.json({ formId: existing.id });

    const form = await prisma.onboardingForm.create({
      data: { userId: req.user!.id, status: "RASCUNHO", currentStep: 0, stepData: "{}" },
    });

    res.json({ formId: form.id });
  } catch (e) {
    next(e);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: { pricing: true, uploads: true, history: { orderBy: { savedAt: "desc" }, take: 50 } },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const normalized = {
      ...form,
      stepData: safeJsonParse(form.stepData, {}),
      pricing: (form.pricing ?? []).map((p: any) => ({ ...p, rows: safeJsonParse(p.rows, []) })),
    };

    res.json({ form: normalized });
  } catch (e) {
    next(e);
  }
});

// Auto-save per step
router.put("/:id/step/:stepIndex", requireAuth, async (req, res, next) => {
  try {
    const stepIndex = Number(req.params.stepIndex);
    const parsed = StepUpdateSchema.parse({ ...req.body, stepIndex });

    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (form.status === "ENVIADO") return res.status(400).json({ message: "Formulário já foi enviado." });

    const current = safeJsonParse<any>(form.stepData, {});
    const nextData = { ...current, ...parsed.data };

    // (sem upsert de pricing aqui — não faz parte da jornada atual)

    const updated = await prisma.onboardingForm.update({
      where: { id: form.id },
      data: {
        stepData: safeJsonStringify(nextData, "{}"),
        currentStep: parsed.currentStep ?? Math.max(form.currentStep, stepIndex),
      },
      include: { pricing: true, uploads: true, history: { orderBy: { savedAt: "desc" }, take: 50 } },
    });

    await prisma.saveHistory.create({ data: { formId: form.id, stepIndex } });

    const normalizedUpdated: any = {
      ...updated,
      stepData: safeJsonParse(updated.stepData, {}),
      pricing: (updated.pricing ?? []).map((p: any) => ({ ...p, rows: safeJsonParse(p.rows, []) })),
    };

    res.json({ form: normalizedUpdated });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/submit", requireAuth, async (req, res, next) => {
  try {
    SubmitSchema.parse(req.body);
    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (form.status === "ENVIADO") return res.status(400).json({ message: "Formulário já foi enviado." });

    const updated = await prisma.onboardingForm.update({
      where: { id: form.id },
      data: { status: "ENVIADO" },
      include: { pricing: true, uploads: true, history: { orderBy: { savedAt: "desc" }, take: 50 } },
    });

    const normalizedUpdated: any = {
      ...updated,
      stepData: safeJsonParse(updated.stepData, {}),
      pricing: (updated.pricing ?? []).map((p: any) => ({ ...p, rows: safeJsonParse(p.rows, []) })),
    };

    res.json({ form: normalizedUpdated });
  } catch (e) {
    next(e);
  }
});

export default router;