import { Router } from "express";
import { z } from "zod";
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

router.use(requireAuth, requireAdmin);

// Stats (dashboard)
router.get("/stats", async (req, res, next) => {
  try {
    const [total, draft, submitted] = await Promise.all([
      prisma.onboardingForm.count(),
      prisma.onboardingForm.count({ where: { status: "RASCUNHO" } }),
      prisma.onboardingForm.count({ where: { status: "ENVIADO" } }),
    ]);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last7d = await prisma.onboardingForm.count({ where: { updatedAt: { gte: sevenDaysAgo } } });

    res.json({ stats: { total, draft, submitted, last7d } });
  } catch (e) {
    next(e);
  }
});

// Create user (admin creates client)
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

// List forms with filters
router.get("/forms", async (req, res, next) => {
  try {
    const qSchema = z.object({
      status: z.enum(["RASCUNHO", "ENVIADO"]).optional(),
      search: z.string().optional(),
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

    const [total, forms] = await Promise.all([
      prisma.onboardingForm.count({ where }),
      prisma.onboardingForm.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          uploads: false,
        },
        orderBy: { updatedAt: "desc" },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);

    const normalized = (forms as any[]).map((f) => ({ ...f, stepData: safeJsonParse(f.stepData, {}) }));
    res.json({ total, forms: normalized });
  } catch (e) {
    next(e);
  }
});

router.get("/forms/:id", async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { name: true, email: true } }, pricing: true, uploads: true, history: { orderBy: { savedAt: "desc" }, take: 200 } },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

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

// CSV export (list)
router.get("/forms.csv", async (_req, res, next) => {
  try {
    const forms = await prisma.onboardingForm.findMany({
      include: { user: true },
      orderBy: { updatedAt: "desc" },
      take: 1000,
    });

    const rows = forms.map((f) => {
      const data = safeJsonParse<any>(f.stepData, {});
      const page1 = data?.page1 ?? {};
      const page2 = data?.page2 ?? {};
      return {
        id: f.id,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        userName: f.user?.name ?? "",
        userEmail: f.user?.email ?? "",
        systemsJson: JSON.stringify(page1?.systems ?? {}),
        servicesOffered: (page1?.servicesOffered ?? []).join("; "),
        pricingFactors: (page2?.pricingFactors ?? []).join("; "),
        motivation: String(page2?.motivation ?? ""),
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

// CSV export (single)
router.get("/forms/:id.csv", async (req, res, next) => {
  try {
    const f = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!f) return res.status(404).json({ message: "Formulário não encontrado." });

    const data = safeJsonParse<any>(f.stepData, {});

    const csv = stringify([
      {
        id: f.id,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
        userName: f.user?.name ?? "",
        userEmail: f.user?.email ?? "",
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
