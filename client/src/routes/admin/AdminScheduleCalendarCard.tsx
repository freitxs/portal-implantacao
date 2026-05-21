import React from "react";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CheckCircleOutlineRoundedIcon from "@mui/icons-material/CheckCircleOutlineRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, Button, Card, CardContent, Chip, Divider, IconButton, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import dayjs from "../../lib/dayjs";
import type { Appointment, AppointmentStatus, ScheduleAvailabilityDay, ScheduleSlot } from "../../types";
import { useToast } from "../../components/ToastProvider";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const panelSx = {
  border: "1px solid rgba(15,23,42,0.1)",
  borderRadius: 6,
  boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
} as const;

function appointmentStatusLabel(status?: string) {
  return {
    RESERVADO: "Reservado",
    CONFIRMADO_EQUIPE: "Confirmado pela equipe",
    REAGENDADO: "Reagendado",
    REALIZADO: "Realizado",
    CANCELADO: "Cancelado",
  }[status ?? "RESERVADO"] ?? status ?? "Reservado";
}

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

export function AdminScheduleCalendarCard({
  formId,
  appointment,
  refresh,
}: {
  formId: string;
  appointment?: Appointment | null;
  refresh: () => void;
}) {
  const { toast } = useToast();
  const availabilityQuery = useQuery({
    queryKey: ["scheduleAvailability", formId],
    enabled: Boolean(formId),
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
    staleTime: 30_000,
  });

  const [draft, setDraft] = React.useState({
    startAt: appointment?.startAt ? dayjs(appointment.startAt).format("YYYY-MM-DDTHH:mm") : "",
    endAt: appointment?.endAt ? dayjs(appointment.endAt).format("YYYY-MM-DDTHH:mm") : "",
  });
  const [selectedMonth, setSelectedMonth] = React.useState("");
  const [selectedDateKey, setSelectedDateKey] = React.useState("");
  const [selectedSlot, setSelectedSlot] = React.useState<ScheduleSlot | null>(null);

  React.useEffect(() => {
    setDraft({
      startAt: appointment?.startAt ? dayjs(appointment.startAt).format("YYYY-MM-DDTHH:mm") : "",
      endAt: appointment?.endAt ? dayjs(appointment.endAt).format("YYYY-MM-DDTHH:mm") : "",
    });
  }, [appointment?.id, appointment?.startAt, appointment?.endAt]);

  React.useEffect(() => {
    if (!selectedSlot?.available) return;
    setDraft({
      startAt: dayjs(selectedSlot.startAt).format("YYYY-MM-DDTHH:mm"),
      endAt: dayjs(selectedSlot.endAt).format("YYYY-MM-DDTHH:mm"),
    });
  }, [selectedSlot]);

  const saveMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/api/schedules/admin", {
          formId,
          startAt: new Date(draft.startAt).toISOString(),
          endAt: new Date(draft.endAt).toISOString(),
        })
      ).data as { appointment: Appointment },
    onSuccess: () => {
      toast({ message: "Agendamento salvo com sucesso.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível salvar o agendamento.", severity: "error" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (status: "CONFIRMADO_EQUIPE" | "REALIZADO" | "CANCELADO") =>
      (await api.post(`/api/schedules/admin/${appointment?.id}/status`, { status })).data as { appointment: Appointment },
    onSuccess: () => {
      toast({ message: "Status do agendamento atualizado.", severity: "success" });
      refresh();
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar o status do agendamento.", severity: "error" });
    },
  });

  const canSave = Boolean(draft.startAt && draft.endAt);
  const availability = availabilityQuery.data;
  const weekdayDays = React.useMemo(
    () =>
      (availability?.days ?? []).filter((day) => {
        const current = dayjs(day.dateKey);
        return current.day() !== 0 && current.day() !== 6;
      }),
    [availability?.days]
  );
  const monthKeys = React.useMemo(() => Array.from(new Set(weekdayDays.map((day) => toMonthKey(day.dateKey)))), [weekdayDays]);

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
  const activeAppointment =
    appointment && appointment.status !== "CANCELADO" && appointment.status !== "DISPONIVEL_AGENDAMENTO" ? appointment : null;

  return (
    <Stack spacing={2}>
      <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
        <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "flex-start" }}>
            <Box sx={{ maxWidth: 860 }}>
              <Typography sx={{ fontWeight: 900, fontSize: 24 }}>Agendamento do treinamento inicial</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.8 }}>
                Visualize a mesma agenda comum do cliente e, quando necessário, registre horários personalizados para a operação administrativa.
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Horário atual: {activeAppointment ? formatAppointmentRange(activeAppointment) : "Ainda não definido."}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }}>
              <Chip label="Calendário comum" variant="outlined" sx={{ borderRadius: 999, fontWeight: 700 }} />
              {appointment ? (
                <Chip
                  label={appointmentStatusLabel(appointment.status)}
                  color={appointment.status === "CONFIRMADO_EQUIPE" || appointment.status === "REALIZADO" ? "success" : "default"}
                />
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {activeAppointment ? (
        <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
              <CheckCircleOutlineRoundedIcon color="success" />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Horário registrado
              </Typography>
            </Stack>
            <Typography color="text.secondary">O treinamento está configurado para {formatAppointmentRange(activeAppointment)}.</Typography>
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

      {selectedMonth ? (
        <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", xl: "1.08fr 0.92fr" } }}>
          <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.98)" }}>
            <CardContent sx={{ p: { xs: 2.4, md: 3 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.2 }}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box sx={{ width: 42, height: 42, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "rgba(19,59,46,0.08)", color: "primary.main" }}>
                    <CalendarMonthOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.9 }}>
                      Calendário mensal
                    </Typography>
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
                      disabled={cell.isWeekend || toMonthKey(cell.dateKey) !== selectedMonth}
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
                  Horários de sábado e domingo não são exibidos para agendamento.
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
                  <Typography sx={{ fontSize: 12.5, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.9 }}>
                    Horários do dia
                  </Typography>
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
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderRadius: 3.5,
                        border: selected ? "1px solid rgba(19,59,46,0.4)" : "1px solid rgba(15,23,42,0.08)",
                        bgcolor: selected ? "rgba(19,59,46,0.08)" : "rgba(255,255,255,0.96)",
                        color: "text.primary",
                        px: 2,
                        py: 1.5,
                        "&:hover": {
                          bgcolor: selected ? "rgba(19,59,46,0.1)" : "rgba(248,250,252,0.96)",
                        },
                        "&.Mui-disabled": {
                          bgcolor: "rgba(248,250,252,0.9)",
                          color: "text.disabled",
                          borderColor: "rgba(15,23,42,0.08)",
                        },
                      }}
                    >
                      <Stack spacing={0.3} sx={{ textAlign: "left" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>
                          {`${dayjs(slot.startAt).format("HH:mm")} às ${dayjs(slot.endAt).format("HH:mm")}`}
                        </Typography>
                        <Typography sx={{ fontSize: 12.8, color: "text.secondary" }}>
                          {slot.available ? "Bloco padrão disponível para reserva." : "Bloco ocupado por reserva ou sobreposição existente."}
                        </Typography>
                      </Stack>
                      <Chip
                        label={slotStatusLabel(slot, selectedSlot)}
                        color={selected ? "success" : slot.available ? "default" : "warning"}
                        variant={selected ? "filled" : "outlined"}
                        sx={{ borderRadius: 999, fontWeight: 700 }}
                      />
                    </Button>
                  );
                })}

                {!selectedDaySlots.length ? <Typography color="text.secondary">Nenhum bloco exibido para esta data.</Typography> : null}
              </Stack>

              <Box sx={{ mt: 2.2, borderTop: "1px solid rgba(15,23,42,0.08)", pt: 1.6 }}>
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <InfoOutlinedIcon sx={{ color: "text.secondary", fontSize: 18, mt: 0.15 }} />
                  <Typography color="text.secondary" sx={{ fontSize: 13.25 }}>
                    Esta visualização segue a mesma agenda comum do cliente. Para horários quebrados, use os campos manuais abaixo.
                  </Typography>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      ) : !availabilityQuery.isLoading ? (
        <Card sx={{ ...panelSx, bgcolor: "rgba(255,255,255,0.96)" }}>
          <CardContent sx={{ p: { xs: 3, md: 3.5 } }}>
            <Typography color="text.secondary">
              Ainda não há blocos visíveis no calendário comum para este formulário. Os controles manuais do admin continuam disponíveis abaixo.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between">
            <Box sx={{ maxWidth: 720 }}>
              <Typography sx={{ fontWeight: 900 }}>Controle manual do admin</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Use este bloco para criar ou ajustar horários personalizados, incluindo intervalos quebrados como 09:30-11:30.
              </Typography>
            </Box>

            <Box sx={{ width: { xs: "100%", lg: 380 }, display: "grid", gap: 1.25 }}>
              <TextField
                label="Início"
                type="datetime-local"
                value={draft.startAt}
                onChange={(event) => setDraft((prev) => ({ ...prev, startAt: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Fim"
                type="datetime-local"
                value={draft.endAt}
                onChange={(event) => setDraft((prev) => ({ ...prev, endAt: event.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
              <Button variant="contained" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {appointment ? "Atualizar horário" : "Criar horário"}
              </Button>
            </Box>
          </Stack>

          {appointment ? (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Button variant="outlined" color="success" onClick={() => statusMutation.mutate("CONFIRMADO_EQUIPE")}>
                  Confirmar treinamento
                </Button>
                <Button variant="outlined" color="primary" onClick={() => statusMutation.mutate("REALIZADO")}>
                  Marcar como realizado
                </Button>
                <Button variant="outlined" color="warning" onClick={() => statusMutation.mutate("CANCELADO")}>
                  Cancelar
                </Button>
              </Stack>
            </>
          ) : null}
        </CardContent>
      </Card>
    </Stack>
  );
}
