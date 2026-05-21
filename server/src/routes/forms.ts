import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { createImplementationLog, parseImplementationLog } from "../lib/implementationLogs.js";
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

function isPlainObject(value: any) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeStepData(current: any, incoming: any): any {
  if (Array.isArray(incoming)) return incoming;
  if (!isPlainObject(current) || !isPlainObject(incoming)) return incoming;

  const merged: Record<string, any> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = isPlainObject(value) ? mergeStepData(current?.[key], value) : value;
  }
  return merged;
}

function canAccessForm(user: any, form: any) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return form.userId === user.id;
}

function formInclude() {
  return {
    user: { select: { id: true, name: true, email: true, role: true } },
    pricing: true,
    uploads: {
      include: {
        logs: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { createdAt: "desc" as const },
        },
      },
    },
    appointment: {
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
      },
    },
    fileLogs: {
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: "desc" as const },
      take: 200,
    },
    history: { orderBy: { savedAt: "desc" as const }, take: 50 },
    implementationLogs: {
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "desc" as const },
      take: 300,
    },
    stageAcceptances: {
      include: {
        acceptedByUser: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { acceptedAt: "desc" as const },
      take: 20,
    },
  };
}

function normalizeForm(form: any) {
  return {
    ...form,
    stepData: safeJsonParse(form.stepData, {}),
    pricing: (form.pricing ?? []).map((pricing: any) => ({ ...pricing, rows: safeJsonParse(pricing.rows, []) })),
    implementationLogs: (form.implementationLogs ?? []).map(parseImplementationLog),
  };
}

function joinOrNull(values?: string[]) {
  return values && values.length ? values.join(", ") : null;
}

function getActiveUpload(form: any, type: string) {
  return (form.uploads ?? []).find((upload: any) => upload.type === type && upload.status !== "EXCLUIDO_ADMIN") ?? null;
}

function buildStage01SummarySnapshot(form: any) {
  const stepData = safeJsonParse<any>(form.stepData, {});
  const office = stepData.office ?? {};
  const page1 = stepData.page1 ?? {};
  const page2 = stepData.page2 ?? {};
  const email = stepData.email ?? {};
  const uploadsState = stepData.uploads ?? {};
  const proposal = getActiveUpload(form, "PROPOSTA");
  const contract = getActiveUpload(form, "CONTRATO");
  const clientList = getActiveUpload(form, "RELACAO_CLIENTES");
  const appointment = form.appointment ?? null;

  return {
    title: "Resumo da implantação",
    internalReference: "TAP - controle interno",
    generatedAt: new Date().toISOString(),
    formId: form.id,
    stageKey: "ETAPA_01",
    stageStatus: stepData.stage01Completion?.status ?? "EM_ANDAMENTO",
    office: {
      officeName: office.officeName ?? null,
      cityUf: office.cityUf ?? null,
      activeCompanies: office.activeCompanies ?? null,
    },
    completionContact: {
      responsibleName: office.responsibleName ?? form.user?.name ?? null,
      responsibleEmail: office.email ?? form.user?.email ?? null,
      responsibleWhatsapp: office.whatsapp ?? null,
    },
    systems: {
      erpSelected: joinOrNull(page1.systems?.erpContabil?.values),
      erpOtherText: page1.systems?.erpContabil?.otherText ?? null,
      erpEnvironment: page1.erpEnvironment ?? null,
    },
    pricing: {
      criteria: page2.pricingFactors ?? [],
      expectation: page2.expectation ?? null,
    },
    emailSetup: {
      providerOptions: email.providerOptions ?? [],
      providerOtherText: email.providerOtherText ?? null,
      tiContactName: email.tiContactName ?? null,
      tiContactPhone: email.tiContactPhone ?? null,
    },
    proposal: proposal
      ? { type: "MODELO_PROPRIO", filename: proposal.filename }
      : uploadsState.noProposalTemplate && uploadsState.selectedProposalTemplateId
        ? {
            type: "MODELO_HONORARIUM",
            templateId: uploadsState.selectedProposalTemplateId,
            templateName: uploadsState.selectedProposalTemplateName ?? null,
            templateFilename: uploadsState.selectedProposalTemplateFilename ?? null,
            templatePath: uploadsState.selectedProposalTemplatePath ?? null,
          }
        : null,
    contract: contract
      ? { type: "MODELO_PROPRIO", filename: contract.filename }
      : uploadsState.contractAcknowledged
        ? {
            type: "CONTRATO_PADRAO_CONFIRMADO",
            templateName: "Contrato padrão Honorarium",
            templateFilename: uploadsState.contractStandardFilename ?? null,
            viewedAt: uploadsState.contractStandardViewedAt || null,
            downloadedAt: uploadsState.contractStandardDownloadedAt || null,
            acknowledgedAt: uploadsState.contractAcknowledgedAt || null,
          }
        : null,
    clientList: clientList
      ? { sent: true, filename: clientList.filename }
      : { sent: false, filename: null },
    users: (email.users ?? [])
      .filter((user: any) => user?.name || user?.email)
      .map((user: any) => ({
        name: user.name ?? null,
        email: user.email ?? null,
        roleOrFunction: user.roleOrFunction ?? null,
        attendsTraining: Boolean(user.attendsTraining),
        isEnvironmentAdmin: Boolean(user.isEnvironmentAdmin),
      })),
    appointment: appointment
      ? {
          startAt: appointment.startAt,
          endAt: appointment.endAt,
          status: appointment.status,
        }
      : null,
    support: {
      label: "Suporte Honorarium",
      link: "/ajuda",
    },
  };
}

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
      include: formInclude(),
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    res.json({ form: normalizeForm(form) });
  } catch (e) {
    next(e);
  }
});

router.put("/:id/step/:stepIndex", requireAuth, async (req, res, next) => {
  try {
    const stepIndex = Number(req.params.stepIndex);
    const parsed = StepUpdateSchema.parse({ ...req.body, stepIndex });

    const form = await prisma.onboardingForm.findUnique({ where: { id: req.params.id } });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });
    if (form.status === "ENVIADO") return res.status(400).json({ message: "Formulário já foi enviado." });

    const current = safeJsonParse<any>(form.stepData, {});
    const nextData = mergeStepData(current, parsed.data ?? {});

    const updated = await prisma.onboardingForm.update({
      where: { id: form.id },
      data: {
        stepData: safeJsonStringify(nextData, "{}"),
        currentStep: parsed.currentStep ?? Math.max(form.currentStep, stepIndex + 1),
      },
      include: formInclude(),
    });

    await prisma.saveHistory.create({ data: { formId: form.id, stepIndex } });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "ALTERACAO_RESPOSTAS_ESTRUTURADAS",
      entityType: "FORM_STEP",
      entityId: String(stepIndex),
      metadata: {
        stepIndex,
        currentStep: parsed.currentStep ?? null,
        changedKeys: Object.keys(parsed.data ?? {}),
      },
    });

    res.json({ form: normalizeForm(updated) });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/accept-stage01", requireAuth, async (req, res, next) => {
  try {
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: formInclude(),
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });
    if (!canAccessForm(req.user!, form)) return res.status(403).json({ message: "Sem permissão." });

    const isOwnerClient = req.user!.role === "CLIENT" && form.userId === req.user!.id;
    const isAdmin = req.user!.role === "ADMIN";
    if (!isOwnerClient && !isAdmin) {
      return res.status(403).json({ message: "Sem permissão para concluir esta etapa." });
    }

    if (!form.appointment || !["CONFIRMADO_EQUIPE", "REALIZADO"].includes(form.appointment.status)) {
      return res.status(400).json({ message: "O resumo da implantação pode ser concluído após a confirmação do treinamento da Etapa 01." });
    }

    const currentStepData = safeJsonParse<any>(form.stepData, {});
    const acceptedAt = new Date();
    const latestAcceptance = form.stageAcceptances?.find((item: any) => item.stageKey === "ETAPA_01") ?? null;
    if (latestAcceptance) {
      return res.status(400).json({ message: "A conclusão da Etapa 01 já foi registrada para este formulário." });
    }

    const snapshot = buildStage01SummarySnapshot({
      ...form,
      stepData: safeJsonStringify(
        {
          ...currentStepData,
          stage01Completion: {
            status: "CONCLUIDA",
            acceptedAt: acceptedAt.toISOString(),
            acceptedByUserId: req.user!.id,
            acceptedByUserName: form.user?.name ?? null,
            nextStageRelease: "DEPENDENTE_LIBERACAO_ADMINISTRATIVA",
          },
        },
        "{}"
      ),
    });
    const version = 1;

    const updatedForm = await prisma.$transaction(async (tx) => {
      await tx.stageAcceptance.create({
        data: {
          formId: form.id,
          stageKey: "ETAPA_01",
          status: "CONCLUIDA",
          version,
          summarySnapshot: JSON.stringify(snapshot),
          acceptedByUserId: req.user!.id,
          acceptedAt,
        },
      });

      await tx.saveHistory.create({ data: { formId: form.id, stepIndex: 5 } });
      await createImplementationLog({
        formId: form.id,
        userId: req.user!.id,
        action: "ACEITE_CONCLUSAO_ETAPA",
        entityType: "STAGE_ACCEPTANCE",
        entityId: "ETAPA_01",
        metadata: {
          stageKey: "ETAPA_01",
          version,
          acceptedAt: acceptedAt.toISOString(),
          nextStageRelease: "DEPENDENTE_LIBERACAO_ADMINISTRATIVA",
        },
      }, tx as any);

      return tx.onboardingForm.update({
        where: { id: form.id },
        data: {
          stepData: safeJsonStringify(
            {
              ...currentStepData,
              stage01Completion: {
                status: "CONCLUIDA",
                acceptedAt: acceptedAt.toISOString(),
                acceptedByUserId: req.user!.id,
                acceptedByUserName: form.user?.name ?? null,
                acceptanceVersion: version,
                nextStageRelease: "DEPENDENTE_LIBERACAO_ADMINISTRATIVA",
              },
            },
            "{}"
          ),
        },
        include: formInclude(),
      });
    });

    res.json({ form: normalizeForm(updatedForm) });
  } catch (e) {
    next(e);
  }
});

router.post("/:id/stage-access", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "ADMIN") return res.status(403).json({ message: "Sem permissão." });

    const body = StepUpdateSchema.pick({ data: true }).parse(req.body);
    const form = await prisma.onboardingForm.findUnique({
      where: { id: req.params.id },
      include: formInclude(),
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const currentStepData = safeJsonParse<any>(form.stepData, {});
    const nextStageAccess = {
      ...(currentStepData.stageAccess ?? {}),
      ...(body.data?.stageAccess ?? {}),
    };

    const updated = await prisma.onboardingForm.update({
      where: { id: form.id },
      data: {
        stepData: safeJsonStringify(
          {
            ...currentStepData,
            stageAccess: nextStageAccess,
          },
          "{}"
        ),
      },
      include: formInclude(),
    });

    await prisma.saveHistory.create({ data: { formId: form.id, stepIndex: 6 } });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: body.data?.stageAccess?.stage2Released === false || body.data?.stageAccess?.stage3Released === false
        ? "REABERTURA_ETAPA"
        : "LIBERACAO_PROXIMA_ETAPA",
      entityType: "STAGE_ACCESS",
      metadata: {
        stageAccess: nextStageAccess,
      },
    });

    res.json({ form: normalizeForm(updated) });
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
      include: formInclude(),
    });

    res.json({ form: normalizeForm(updated) });
  } catch (e) {
    next(e);
  }
});

export default router;
