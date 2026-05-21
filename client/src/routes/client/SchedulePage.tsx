import React from "react";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Button, Card, CardContent, Chip, IconButton, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { useToast } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import dayjs from "../../lib/dayjs";
import type { Appointment, AppointmentStatus, OnboardingForm, ScheduleAvailabilityDay, ScheduleSlot } from "../../types";
import { getReviewChecklist } from "../Wizard/reviewChecklist";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function slotStatusLabel(slot: ScheduleSlot, selectedSlot?: ScheduleSlot | null) {
  if (selectedSlot?.startAt === slot.startAt && slot.available) return "Selecionado";
  if (slot.status === "DISPONIVEL") return "Disponível";
  return "Ocupado";
}

function formatAppointmentRange(appointment?: Appointment | null) {
  if (!appointment) return "Sem horário reservado no momento.";
  return `${dayjs(appointment.startAt).format("DD/MM/YYYY [às] HH:mm")} até ${dayjs(appointment.endAt).format("HH:mm")}`;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
}

function toMonthKey(date: string) {
  return dayjs(date).format("YYYY-MM");
}

function buildCalendarCells(monthKey: string, availableDays: ScheduleAvailabilityDay[]) {
  const monthStart = dayjs(`${monthKey}-01`);
  const monthEnd = monthStart.endOf("month");
  const availableByKey = new Map(availableDays.map((day) => [day.dateKey, day]));
  const firstWeekdayIndex = (monthStart.day() + 6) % 7;
  const cells: Array<
    | { kind: "empty"; key: string }
    | { kind: "day"; key: string; dateKey: string; label: string; isWeekend: boolean; available: boolean }
  > = [];

  for (let i = 0; i < firstWeekdayIndex; i += 1) {
    cells.push({ kind: "empty", key: `empty-start-${i}` });
  }

  for (let date = monthStart.date(); date <= monthEnd.date(); date += 1) {
    const current = monthStart.date(date);
    const dateKey = current.format("YYYY-MM-DD");
    const isWeekend = current.day() === 0 || current.day() === 6;
    const dayAvailability = availableByKey.get(dateKey);
    const available = Boolean(dayAvailability?.slots?.some((slot) => slot.available));

    cells.push({
      kind: "day",
      key: dateKey,
      dateKey,
      label: current.format("DD"),
      isWeekend,
      available,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `empty-end-${cells.length}` });
  }

  return cells;
}

const panelSx = {
  border: "1px solid rgba(15,23,42,0.1)",
  borderRadius: 6,
  boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
} as const;

export function SchedulePage() {
  const { formId } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const formQuery = useQuery({
    queryKey: ["form", formId, "schedule"],
    queryFn: async () => (await api.get(`/api/forms/${formId}`)).data.form as OnboardingForm,
    enabled: Boolean(formId),
  });

  const form = formQuery.data;
  const checklist = form ? getReviewChecklist(form) : null;
  const canSchedule = Boolean(checklist?.allComplete && checklist?.reviewConfirmed);

  const availabilityQuery = useQuery({
    queryKey: ["scheduleAvailability", formId],
    enabled: Boolean(formId && canSchedule),
    queryFn: async () =>
      (
        await api.get(`/api/schedules/forms/${formId}/availability`, {
          params: { days: 21 },
        })
      ).data as {
        availabilityStatus: AppointmentStatus;
        minAdvanceHours: number;
        currentAppointment?: Appointment | null;
        days: ScheduleAvailabilityDay[];
      },
  });

  const reserveMutation = useMutation({
    mutationFn: async (slot: ScheduleSlot) =>
      (
        await api.post(`/api/schedules/forms/${formId}/reserve`, {
          startAt: slot.startAt,
          endAt: slot.endAt,
        })
      ).data as { appointment: Appointment },
    onSuccess: () => {
      toast({ message: "Horário reservado com sucesso.", severity: "success" });
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ["scheduleAvailability", formId] });
      queryClient.invalidateQueries({ queryKey: ["form", formId, "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["form", formId] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível reservar o horário.", severity: "error" });
    },
  });

  const availability = availabilityQuery.data;
  const appointment = availability?.currentAppointment ?? null;
  const activeAppointment = appointment && appointment.status !== "CANCELADO" && appointment.status !== "DISPONIVEL_AGENDAMENTO" ? appointment : null;
  const hasBookingWindow = availability?.availabilityStatus === "DISPONIVEL_AGENDAMENTO";
  const weekdayDays = React.useMemo(
    () =>
      (availability?.days ?? []).filter((day) => {
        const current = dayjs(day.dateKey);
        return current.day() !== 0 && current.day() !== 6;
      }),
    [availability?.days]
  );
  const monthKeys = React.useMemo(() => Array.from(new Set(weekdayDays.map((day) => toMonthKey(day.dateKey)))), [weekdayDays]);
  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [selectedDateKey, setSelectedDateKey] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState<ScheduleSlot | null>(null);

  React.useEffect(() => {
    if (!monthKeys.length) {
      setSelectedMonth("");
      return;
    }
    if (!selectedMonth || !monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth]);

  const visibleDays = React.useMemo(() => weekdayDays.filter((day) => toMonthKey(day.dateKey) === selectedMonth), [selectedMonth, weekdayDays]);

  React.useEffect(() => {
    if (!visibleDays.length) {
      setSelectedDateKey("");
      return;
    }

    const stillVisible = visibleDays.some((day) => day.dateKey === selectedDateKey);
    if (!selectedDateKey || !stillVisible) {
      const firstPreferredDay = visibleDays.find((day) => day.slots.some((slot) => slot.available)) ?? visibleDays[0];
      setSelectedDateKey(firstPreferredDay.dateKey);
    }
  }, [selectedDateKey, visibleDays]);

  React.useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDateKey]);

  const selectedDay = visibleDays.find((day) => day.dateKey === selectedDateKey) ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const currentMonthIndex = monthKeys.findIndex((item) => item === selectedMonth);
  const calendarCells = selectedMonth ? buildCalendarCells(selectedMonth, weekdayDays) : [];

  return (
    <AppShell title="Agendamento do treinamento inicial" formId={formId}>
      <Stack spacing={3}>
        <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
              <Box sx={{ maxWidth: 780 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -1.2 }}>
                  Agendamento do treinamento inicial
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1.1, fontSize: 14.5, lineHeight: 1.7 }}>
                  Escolha um horário disponível. Os blocos têm 2 horas e respeitam antecedência mínima de 48 horas.
                </Typography>
              </Box>
              <Chip label="Calendário comum" variant="outlined" sx={{ alignSelf: { xs: "flex-start", md: "center" }, borderRadius: 999, fontWeight: 700 }} />
            </Stack>
          </CardContent>
        </Card>

        {!canSchedule ? (
          <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
            <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
              <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800 }}>
                Falta concluir a revisão
              </Typography>
              <Stack spacing={1}>
                {(checklist?.missingItems ?? []).map((item) => (
                  <Typography key={item} color="text.secondary">
                    {item}
                  </Typography>
                ))}
              </Stack>
              <Button sx={{ mt: 2.5 }} variant="contained" onClick={() => nav(`/wizard/${formId}`)}>
                Voltar para a revisão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {activeAppointment ? (
              <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                    <CheckCircleOutlineRoundedIcon color="success" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Horário reservado
                    </Typography>
                  </Stack>
                  <Typography color="text.secondary">Treinamento marcado para {formatAppointmentRange(activeAppointment)}.</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Se precisar de ajuste, a equipe pode confirmar ou reagendar esse horário.
                  </Typography>
                </CardContent>
              </Card>
            ) : null}

            {availabilityQuery.isLoading ? (
              <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Typography>Carregando disponibilidade...</Typography>
                </CardContent>
              </Card>
            ) : null}

            {hasBookingWindow && selectedMonth ? (
              <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", xl: "1.08fr 0.92fr" } }}>
                <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.98)" }}>
                  <CardContent sx={{ p: { xs: 2.4, md: 3 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.2 }}>
                      <Stack direction="row" spacing={1.2} alignItems="center">
                        <Box sx={{ width: 42, height: 42, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "rgba(19,59,46,0.08)", color: "primary.main" }}>
                          <CalendarMonthOutlinedIcon />
                        </Box>
                        <Box>
                          <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.9 }}>Calendário mensal</Typography>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {monthLabel(selectedMonth)}
                          </Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" disabled={currentMonthIndex <= 0} onClick={() => setSelectedMonth(monthKeys[currentMonthIndex - 1] ?? selectedMonth)}>
                          <ChevronLeftRoundedIcon />
                        </IconButton>
                        <IconButton size="small" disabled={currentMonthIndex === -1 || currentMonthIndex >= monthKeys.length - 1} onClick={() => setSelectedMonth(monthKeys[currentMonthIndex + 1] ?? selectedMonth)}>
                          <ChevronRightRoundedIcon />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1 }}>
                      {WEEKDAY_LABELS.map((label) => (
                        <Typography key={label} sx={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "text.secondary", py: 0.6 }}>
                          {label}
                        </Typography>
                      ))}

                      {calendarCells.map((cell) =>
                        cell.kind === "empty" ? (
                          <Box key={cell.key} />
                        ) : (
                          <Button
                            key={cell.key}
                            variant="text"
                            disabled={cell.isWeekend || !selectedDay || toMonthKey(cell.dateKey) !== selectedMonth}
                            onClick={() => {
                              if (cell.isWeekend) return;
                              setSelectedDateKey(cell.dateKey);
                            }}
                            sx={{
                              aspectRatio: "1 / 1",
                              borderRadius: 3.5,
                              border: "1px solid rgba(15,23,42,0.08)",
                              minWidth: 0,
                              p: 0,
                              fontSize: 15,
                              fontWeight: 700,
                              color: cell.dateKey === selectedDateKey ? "#f8fafc" : cell.available ? "text.primary" : "text.disabled",
                              bgcolor: cell.dateKey === selectedDateKey ? "#163126" : cell.available ? "rgba(19,59,46,0.08)" : "rgba(248,250,252,0.92)",
                              opacity: cell.isWeekend ? 0.22 : 1,
                              "&:hover": {
                                bgcolor: cell.dateKey === selectedDateKey ? "#163126" : cell.available ? "rgba(19,59,46,0.14)" : "rgba(248,250,252,0.92)",
                              },
                              "&.Mui-disabled": {
                                color: cell.isWeekend ? "transparent" : "text.disabled",
                                borderColor: "rgba(15,23,42,0.06)",
                              },
                            }}
                          >
                            {cell.isWeekend ? "" : cell.label}
                          </Button>
                        )
                      )}
                    </Box>

                    <Box sx={{ mt: 2.2, borderTop: "1px solid rgba(15,23,42,0.08)", pt: 1.6 }}>
                      <Typography color="text.secondary" sx={{ fontSize: 13.25 }}>
                        Sábado e domingo não aparecem para agendamento.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.98)" }}>
                  <CardContent sx={{ p: { xs: 2.4, md: 3 } }}>
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 2.2 }}>
                      <Box sx={{ width: 42, height: 42, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "rgba(19,59,46,0.08)", color: "primary.main" }}>
                        <CalendarMonthOutlinedIcon />
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.9 }}>Horários do dia</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {selectedDay ? `Horários disponíveis em ${dayjs(selectedDay.dateKey).format("DD/MM/YYYY")}` : "Selecione uma data"}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack spacing={1.2}>
                      {selectedDaySlots.map((slot) => {
                        const selected = selectedSlot?.startAt === slot.startAt && slot.available;

                        return (
                          <Button
                            key={slot.startAt}
                            variant="text"
                            disabled={!slot.available || Boolean(activeAppointment)}
                            onClick={() => setSelectedSlot(slot)}
                            sx={{
                              alignItems: "center",
                              border: selected ? "1.5px solid rgba(19,59,46,0.45)" : "1px solid rgba(15,23,42,0.08)",
                              borderRadius: 4,
                              display: "flex",
                              justifyContent: "space-between",
                              px: 1.8,
                              py: 1.55,
                              textAlign: "left",
                              bgcolor: selected ? "rgba(19,59,46,0.08)" : slot.available ? "#fff" : "rgba(248,250,252,0.95)",
                              color: "text.primary",
                              "&:hover": {
                                bgcolor: selected ? "rgba(19,59,46,0.1)" : slot.available ? "rgba(19,59,46,0.04)" : "rgba(248,250,252,0.95)",
                              },
                              "&.Mui-disabled": {
                                opacity: 1,
                                color: "text.disabled",
                              },
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontSize: 16, fontWeight: 800 }}>{slot.label}</Typography>
                              <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.3 }}>Bloco padrão do treinamento inicial</Typography>
                            </Box>
                            <Chip size="small" label={slotStatusLabel(slot, selectedSlot)} color={selected ? "success" : "default"} variant={selected ? "filled" : "outlined"} sx={{ flexShrink: 0 }} />
                          </Button>
                        );
                      })}
                    </Stack>

                    <Stack spacing={1.4} sx={{ mt: 2.25 }}>
                      <Button fullWidth variant="contained" color="secondary" disabled={!selectedSlot || reserveMutation.isPending || Boolean(activeAppointment)} onClick={() => selectedSlot && reserveMutation.mutate(selectedSlot)}>
                        {reserveMutation.isPending ? "Reservando..." : "Reservar horário"}
                      </Button>
                      <Box sx={{ borderTop: "1px solid rgba(15,23,42,0.08)", pt: 1.6, display: "flex", gap: 1, alignItems: "flex-start" }}>
                        <InfoOutlinedIcon sx={{ fontSize: 18, color: "text.secondary", mt: 0.15 }} />
                        <Typography color="text.secondary" sx={{ fontSize: 13.25, lineHeight: 1.55 }}>
                          O convite será controlado manualmente pela equipe nesta versão.
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Box>
            ) : null}

            {!activeAppointment && !hasBookingWindow && !availabilityQuery.isLoading ? (
              <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
                <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
                  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
                    <EventBusyOutlinedIcon color="action" />
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      Agenda em acompanhamento
                    </Typography>
                  </Stack>
                  <Typography color="text.secondary">Ainda não há um novo bloco disponível para reserva.</Typography>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </Stack>
    </AppShell>
  );
}
