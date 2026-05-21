import { Router } from "express";
import { z } from "zod";
import { createImplementationLog } from "../lib/implementationLogs.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

const router = Router();

const CLIENT_BLOCKS = [
  { label: "09:00-11:00", startMinutes: 9 * 60, endMinutes: 11 * 60 },
  { label: "13:30-15:30", startMinutes: 13 * 60 + 30, endMinutes: 15 * 60 + 30 },
  { label: "16:00-18:00", startMinutes: 16 * 60, endMinutes: 18 * 60 },
] as const;

const ACTIVE_APPOINTMENT_STATUSES = ["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO"] as const;
const OCCUPIED_APPOINTMENT_STATUSES = ["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO"] as const;

function safeJsonParse<T>(value: any, fallback: T): T {
  try {
    if (value == null) return fallback;
    if (typeof value === "string") return JSON.parse(value) as T;
    return value as T;
  } catch {
    return fallback;
  }
}

function overlaps(startAt: Date, endAt: Date, compareStartAt: Date, compareEndAt: Date) {
  return startAt < compareEndAt && compareStartAt < endAt;
}

function withMinutes(baseDate: Date, minutes: number) {
  const date = new Date(baseDate);
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isStandardClientBlock(startAt: Date, endAt: Date) {
  const duration = endAt.getTime() - startAt.getTime();
  if (duration !== 2 * 60 * 60 * 1000) return false;
  if (startAt.toDateString() !== endAt.toDateString()) return false;

  const startMinutes = startAt.getHours() * 60 + startAt.getMinutes();
  const endMinutes = endAt.getHours() * 60 + endAt.getMinutes();

  return CLIENT_BLOCKS.some((block) => block.startMinutes === startMinutes && block.endMinutes === endMinutes);
}

function getTrainingAvailabilityStatus(form: any, appointment: any) {
  const stepData = safeJsonParse<any>(form?.stepData, {});
  const reviewConfirmed = Boolean(stepData?.review?.confirmedAt);

  if (!reviewConfirmed) return "NAO_DISPONIVEL";
  if (!appointment) return "DISPONIVEL_AGENDAMENTO";
  if (appointment.status === "CANCELADO") return "DISPONIVEL_AGENDAMENTO";
  if (appointment.status === "REALIZADO") return "REALIZADO";
  return appointment.status;
}

async function findOverlappingAppointment(startAt: Date, endAt: Date, ignoreFormId?: string) {
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: [...OCCUPIED_APPOINTMENT_STATUSES] },
      endAt: { gt: startAt },
      startAt: { lt: endAt },
      ...(ignoreFormId ? { formId: { not: ignoreFormId } } : {}),
    },
    take: 1,
    orderBy: { startAt: "asc" },
  });

  return appointments[0] ?? null;
}

async function getClientFormOrThrow(formId: string, user: any) {
  const form = await prisma.onboardingForm.findUnique({
    where: { id: formId },
    include: {
      appointment: {
        include: {
          createdByUser: { select: { id: true, name: true, email: true, role: true } },
        },
      },
    },
  });

  if (!form) {
    const error: any = new Error("Formulário não encontrado.");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "ADMIN" && form.userId !== user.id) {
    const error: any = new Error("Sem permissão.");
    error.statusCode = 403;
    throw error;
  }

  return form;
}

router.get("/forms/:formId/availability", requireAuth, async (req, res, next) => {
  try {
    const querySchema = z.object({
      days: z.coerce.number().int().min(7).max(30).default(14),
    });
    const { days } = querySchema.parse(req.query);
    const form = await getClientFormOrThrow(req.params.formId, req.user!);

    const availabilityStatus = getTrainingAvailabilityStatus(form, form.appointment);
    const now = new Date();
    const minStartAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const rangeStart = startOfDay(now);
    const rangeEnd = addDays(rangeStart, days + 1);

    const appointments = await prisma.appointment.findMany({
      where: {
        status: { in: [...OCCUPIED_APPOINTMENT_STATUSES] },
        endAt: { gt: rangeStart },
        startAt: { lt: rangeEnd },
      },
      orderBy: { startAt: "asc" },
    });

    const scheduleDays = Array.from({ length: days }, (_, index) => {
      const currentDate = addDays(rangeStart, index);
      const slots = CLIENT_BLOCKS.map((block) => {
        const startAt = withMinutes(currentDate, block.startMinutes);
        const endAt = withMinutes(currentDate, block.endMinutes);
        const beforeAdvanceWindow = startAt.getTime() < minStartAt.getTime();
        const occupied = appointments.some((appointment) =>
          overlaps(startAt, endAt, appointment.startAt, appointment.endAt)
        );
        const available =
          availabilityStatus === "DISPONIVEL_AGENDAMENTO" && !beforeAdvanceWindow && !occupied;

        return {
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          label: block.label,
          dateKey: currentDate.toISOString().slice(0, 10),
          dateLabel: currentDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
          }),
          status: available ? "DISPONIVEL" : beforeAdvanceWindow ? "NAO_DISPONIVEL" : "OCUPADO",
          available,
        };
      });

      return {
        dateKey: currentDate.toISOString().slice(0, 10),
        dateLabel: currentDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
        }),
        slots,
      };
    });

    res.json({
      availabilityStatus,
      minAdvanceHours: 48,
      currentAppointment: form.appointment,
      days: scheduleDays,
    });
  } catch (e) {
    next(e);
  }
});

router.post("/forms/:formId/reserve", requireAuth, async (req, res, next) => {
  try {
    if (req.user?.role !== "CLIENT") return res.status(403).json({ message: "Sem permissão." });

    const bodySchema = z.object({
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
    });
    const { startAt, endAt } = bodySchema.parse(req.body);
    const form = await getClientFormOrThrow(req.params.formId, req.user!);
    const availabilityStatus = getTrainingAvailabilityStatus(form, form.appointment);

    if (availabilityStatus === "NAO_DISPONIVEL") {
      return res.status(400).json({ message: "A revisão da Etapa 01 precisa ser concluída antes do agendamento." });
    }

    if (form.appointment && form.appointment.status === "REALIZADO") {
      return res.status(400).json({ message: "O treinamento desta etapa já foi realizado." });
    }

    if (form.appointment && ACTIVE_APPOINTMENT_STATUSES.includes(form.appointment.status as any)) {
      return res.status(400).json({ message: "Já existe um horário reservado para este treinamento." });
    }

    if (!isStandardClientBlock(startAt, endAt)) {
      return res.status(400).json({ message: "Selecione um bloco padrão de 2 horas para o treinamento." });
    }

    const minStartAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    if (startAt.getTime() < minStartAt.getTime()) {
      return res.status(400).json({ message: "Escolha um horário com antecedência mínima de 48 horas." });
    }

    const conflictingAppointment = await findOverlappingAppointment(startAt, endAt, form.id);
    if (conflictingAppointment) {
      return res.status(409).json({ message: "Este horário já está ocupado na agenda compartilhada." });
    }

    const appointment = await prisma.appointment.upsert({
      where: { formId: form.id },
      update: {
        startAt,
        endAt,
        status: "RESERVADO",
        externalCalendarProvider: null,
        externalCalendarEventId: null,
      },
      create: {
        formId: form.id,
        startAt,
        endAt,
        status: "RESERVADO",
        createdByUserId: req.user!.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    await createImplementationLog({
      formId: form.id,
      userId: req.user!.id,
      action: "AGENDAMENTO_INICIAL",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      metadata: {
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
      },
    });

    res.json({ appointment });
  } catch (e) {
    next(e);
  }
});

router.get("/admin", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const querySchema = z.object({
      formId: z.string().optional(),
      status: z.enum(["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO", "REALIZADO", "CANCELADO"]).optional(),
    });
    const query = querySchema.parse(req.query);

    const appointments = await prisma.appointment.findMany({
      where: {
        ...(query.formId ? { formId: query.formId } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        form: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { startAt: "asc" },
    });

    res.json({ appointments });
  } catch (e) {
    next(e);
  }
});

router.post("/admin", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const bodySchema = z.object({
      formId: z.string().min(1),
      startAt: z.coerce.date(),
      endAt: z.coerce.date(),
    });
    const { formId, startAt, endAt } = bodySchema.parse(req.body);

    if (endAt.getTime() <= startAt.getTime()) {
      return res.status(400).json({ message: "Informe um intervalo válido para o treinamento." });
    }

    const form = await prisma.onboardingForm.findUnique({
      where: { id: formId },
      include: { appointment: true },
    });
    if (!form) return res.status(404).json({ message: "Formulário não encontrado." });

    const conflictingAppointment = await findOverlappingAppointment(startAt, endAt, formId);
    if (conflictingAppointment) {
      return res.status(409).json({ message: "Este intervalo já está ocupado na agenda compartilhada." });
    }

    const nextStatus =
      form.appointment && form.appointment.status !== "CANCELADO" && form.appointment.status !== "REALIZADO"
        ? "REAGENDADO"
        : "RESERVADO";

    const appointment = await prisma.appointment.upsert({
      where: { formId },
      update: {
        startAt,
        endAt,
        status: nextStatus,
      },
      create: {
        formId,
        startAt,
        endAt,
        status: "RESERVADO",
        createdByUserId: req.user!.id,
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        form: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
    await createImplementationLog({
      formId,
      userId: req.user!.id,
      action: "ALTERACAO_AGENDAMENTO_ADMIN",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      metadata: {
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
      },
    });

    res.json({ appointment });
  } catch (e) {
    next(e);
  }
});

router.post("/admin/:appointmentId/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const bodySchema = z.object({
      status: z.enum(["CONFIRMADO_EQUIPE", "REALIZADO", "CANCELADO"]),
    });
    const { status } = bodySchema.parse(req.body);

    const existing = await prisma.appointment.findUnique({
      where: { id: req.params.appointmentId },
    });
    if (!existing) return res.status(404).json({ message: "Agendamento não encontrado." });

    const appointment = await prisma.appointment.update({
      where: { id: existing.id },
      data: { status },
      include: {
        createdByUser: { select: { id: true, name: true, email: true, role: true } },
        form: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
    await createImplementationLog({
      formId: appointment.formId,
      userId: req.user!.id,
      action: status === "CONFIRMADO_EQUIPE" ? "CONFIRMACAO_TREINAMENTO" : status === "REALIZADO" ? "TREINAMENTO_REALIZADO" : "CANCELAMENTO_TREINAMENTO",
      entityType: "APPOINTMENT",
      entityId: appointment.id,
      metadata: {
        status,
      },
    });

    res.json({ appointment });
  } catch (e) {
    next(e);
  }
});

export default router;
