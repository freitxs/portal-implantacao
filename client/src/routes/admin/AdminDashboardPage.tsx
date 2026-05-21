import React from "react";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../../components/AppShell";
import { useToast } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import dayjs from "../../lib/dayjs";
import type { Appointment, AppointmentStatus, OnboardingForm } from "../../types";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const STANDARD_SLOTS = [
  { label: "08:00 às 10:00", start: "08:00", end: "10:00" },
  { label: "10:00 às 12:00", start: "10:00", end: "12:00" },
  { label: "13:30 às 15:30", start: "13:30", end: "15:30" },
  { label: "16:00 às 18:00", start: "16:00", end: "18:00" },
] as const;
const ACTIVE_APPOINTMENT_STATUSES = ["RESERVADO", "CONFIRMADO_EQUIPE", "REAGENDADO"] as const;

type CalendarDay = {
  dateKey: string;
  hasAvailableSlot: boolean;
  slots: Array<{
    label: string;
    startAt: string;
    endAt: string;
    available: boolean;
    overlappingAppointments: Appointment[];
  }>;
};

function appointmentStatusLabel(status?: AppointmentStatus | string) {
  return {
    NAO_DISPONIVEL: "Não disponível",
    DISPONIVEL_AGENDAMENTO: "Disponível para agendamento",
    RESERVADO: "Reservado",
    CONFIRMADO_EQUIPE: "Confirmado pela equipe",
    REAGENDADO: "Reagendado",
    REALIZADO: "Realizado",
    CANCELADO: "Cancelado",
  }[status ?? "NAO_DISPONIVEL"] ?? status ?? "Não disponível";
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(startB).getTime() < new Date(endA).getTime();
}

function getConflictIds(appointments: Appointment[]) {
  const active = appointments.filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status as (typeof ACTIVE_APPOINTMENT_STATUSES)[number]));
  const conflicts = new Set<string>();

  for (let index = 0; index < active.length; index += 1) {
    for (let compareIndex = index + 1; compareIndex < active.length; compareIndex += 1) {
      if (overlaps(active[index].startAt, active[index].endAt, active[compareIndex].startAt, active[compareIndex].endAt)) {
        conflicts.add(active[index].id);
        conflicts.add(active[compareIndex].id);
      }
    }
  }

  return conflicts;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[(month ?? 1) - 1]} ${year}`;
}

function toMonthKey(date: string) {
  return dayjs(date).format("YYYY-MM");
}

function buildCalendarCells(monthKey: string, availableDateKeys: Set<string>) {
  const monthStart = dayjs(`${monthKey}-01`);
  const monthEnd = monthStart.endOf("month");
  const firstWeekdayIndex = (monthStart.day() + 6) % 7;
  const cells: Array<
    | { kind: "empty"; key: string }
    | { kind: "day"; key: string; dateKey: string; label: string; isWeekend: boolean; available: boolean }
  > = [];

  for (let index = 0; index < firstWeekdayIndex; index += 1) {
    cells.push({ kind: "empty", key: `empty-start-${index}` });
  }

  for (let date = monthStart.date(); date <= monthEnd.date(); date += 1) {
    const current = monthStart.date(date);
    const dateKey = current.format("YYYY-MM-DD");
    const isWeekend = current.day() === 0 || current.day() === 6;

    cells.push({
      kind: "day",
      key: dateKey,
      dateKey,
      label: current.format("DD"),
      isWeekend,
      available: availableDateKeys.has(dateKey),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ kind: "empty", key: `empty-end-${cells.length}` });
  }

  return cells;
}

function buildAvailabilityDays(appointments: Appointment[]) {
  const activeAppointments = appointments.filter((appointment) => ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status as (typeof ACTIVE_APPOINTMENT_STATUSES)[number]));
  const start = dayjs().startOf("day");
  const days: CalendarDay[] = [];

  for (let offset = 0; offset < 90; offset += 1) {
    const current = start.add(offset, "day");
    if (current.day() === 0 || current.day() === 6) continue;

    const slots = STANDARD_SLOTS.map((slot) => {
      const [startHour, startMinute] = slot.start.split(":").map(Number);
      const [endHour, endMinute] = slot.end.split(":").map(Number);
      const startAt = current.hour(startHour).minute(startMinute).second(0).millisecond(0);
      const endAt = current.hour(endHour).minute(endMinute).second(0).millisecond(0);
      const overlappingAppointments = activeAppointments.filter((appointment) => overlaps(startAt.toISOString(), endAt.toISOString(), appointment.startAt, appointment.endAt));

      return {
        label: slot.label,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        available: overlappingAppointments.length === 0,
        overlappingAppointments,
      };
    });

    days.push({
      dateKey: current.format("YYYY-MM-DD"),
      hasAvailableSlot: slots.some((slot) => slot.available),
      slots,
    });
  }

  return days;
}

export function AdminDashboardPage() {
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [draft, setDraft] = React.useState({
    formId: "",
    startAt: "",
    endAt: "",
  });
  const [selectedMonth, setSelectedMonth] = React.useState(dayjs().format("YYYY-MM"));
  const [selectedDateKey, setSelectedDateKey] = React.useState(dayjs().format("YYYY-MM-DD"));

  const statsQuery = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () =>
      (await api.get("/api/admin/stats")).data as {
        stats: {
          clientsInTrail: number;
          awaitingAnalysis: number;
          trainingsReserved: number;
          acceptancesPending: number;
          adjustmentsNeeded: number;
        };
      },
    staleTime: 30_000,
  });

  const formsQuery = useQuery({
    queryKey: ["adminForms", "dashboard"],
    queryFn: async () => (await api.get("/api/admin/forms", { params: { page: 1, pageSize: 200 } })).data as { total: number; forms: OnboardingForm[] },
    staleTime: 30_000,
  });

  const schedulesQuery = useQuery({
    queryKey: ["adminSchedules", "dashboard"],
    queryFn: async () => (await api.get("/api/schedules/admin")).data as { appointments: Appointment[] },
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/api/schedules/admin", {
          formId: draft.formId,
          startAt: new Date(draft.startAt).toISOString(),
          endAt: new Date(draft.endAt).toISOString(),
        })
      ).data,
    onSuccess: () => {
      toast({ message: "Horário salvo com sucesso.", severity: "success" });
      setDraft({ formId: "", startAt: "", endAt: "" });
      queryClient.invalidateQueries({ queryKey: ["adminSchedules", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível salvar o horário.", severity: "error" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: "CONFIRMADO_EQUIPE" | "REALIZADO" | "CANCELADO" }) =>
      (await api.post(`/api/schedules/admin/${appointmentId}/status`, { status })).data,
    onSuccess: () => {
      toast({ message: "Status do agendamento atualizado.", severity: "success" });
      queryClient.invalidateQueries({ queryKey: ["adminSchedules", "dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
    onError: (err: any) => {
      toast({ message: err?.response?.data?.message ?? "Não foi possível atualizar o agendamento.", severity: "error" });
    },
  });

  const stats = statsQuery.data?.stats;
  const forms = formsQuery.data?.forms ?? [];
  const appointments = schedulesQuery.data?.appointments ?? [];
  const conflictIds = React.useMemo(() => getConflictIds(appointments), [appointments]);
  const canSave = Boolean(draft.formId && draft.startAt && draft.endAt);
  const availabilityDays = React.useMemo(() => buildAvailabilityDays(appointments), [appointments]);
  const monthKeys = React.useMemo(() => Array.from(new Set(availabilityDays.map((day) => toMonthKey(day.dateKey)))), [availabilityDays]);
  const availableDateKeys = React.useMemo(() => new Set(availabilityDays.filter((day) => day.hasAvailableSlot).map((day) => day.dateKey)), [availabilityDays]);

  React.useEffect(() => {
    if (!monthKeys.length) {
      setSelectedMonth("");
      return;
    }

    if (!monthKeys.includes(selectedMonth)) {
      setSelectedMonth(monthKeys[0]);
    }
  }, [monthKeys, selectedMonth]);

  const visibleDays = React.useMemo(() => availabilityDays.filter((day) => toMonthKey(day.dateKey) === selectedMonth), [availabilityDays, selectedMonth]);

  React.useEffect(() => {
    if (!visibleDays.length) {
      setSelectedDateKey("");
      return;
    }

    const stillVisible = visibleDays.some((day) => day.dateKey === selectedDateKey);
    if (!selectedDateKey || !stillVisible) {
      setSelectedDateKey(visibleDays[0].dateKey);
    }
  }, [selectedDateKey, visibleDays]);

  const selectedDay = visibleDays.find((day) => day.dateKey === selectedDateKey) ?? null;
  const selectedDaySlots = selectedDay?.slots ?? [];
  const selectedDateAppointments = React.useMemo(
    () =>
      appointments
        .filter((appointment) => dayjs(appointment.startAt).format("YYYY-MM-DD") === selectedDateKey)
        .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime()),
    [appointments, selectedDateKey]
  );
  const currentMonthIndex = monthKeys.findIndex((monthKey) => monthKey === selectedMonth);
  const calendarCells = selectedMonth ? buildCalendarCells(selectedMonth, availableDateKeys) : [];

  return (
    <AppShell title="Admin • Visão Geral">
      <Stack spacing={2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Operação da implantação
            </Typography>
            <Typography color="text.secondary">Acompanhe gargalos da trilha, agenda global e próximos movimentos administrativos.</Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={() => nav("/admin/forms")}>
              Abrir clientes
            </Button>
            <Button variant="outlined" component="a" href="/api/admin/forms.csv" target="_blank" rel="noreferrer">
              Exportar CSV
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          {[
            ["Clientes em trilha", stats?.clientsInTrail],
            ["Aguardando análise", stats?.awaitingAnalysis],
            ["Treinamentos reservados", stats?.trainingsReserved],
            ["Aceites pendentes", stats?.acceptancesPending],
            ["Ajustes necessários", stats?.adjustmentsNeeded],
          ].map(([label, value]) => (
            <Card key={label} sx={{ flex: 1 }}>
              <CardContent>
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900 }}>
                  {statsQuery.isLoading ? <Skeleton width={72} /> : value ?? 0}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Card>
          <CardContent>
            <Typography sx={{ fontWeight: 900 }}>Agenda global</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              A agenda abaixo segue o mesmo visual do cliente e continua permitindo horários manuais para a operação.
            </Typography>
            <Divider sx={{ my: 1.5 }} />

            {schedulesQuery.isLoading ? (
              <Typography>Carregando agenda...</Typography>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: "grid", gap: 2.25, gridTemplateColumns: { xs: "1fr", xl: "1.08fr 0.92fr" } }}>
                  <Card variant="outlined" sx={{ borderRadius: 6, boxShadow: "0 18px 40px rgba(15,23,42,0.04)" }}>
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
                              {selectedMonth ? monthLabel(selectedMonth) : "Agenda global"}
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

                  <Card variant="outlined" sx={{ borderRadius: 6, boxShadow: "0 18px 40px rgba(15,23,42,0.04)" }}>
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
                          const occupied = !slot.available;

                          return (
                            <Button
                              key={slot.startAt}
                              variant="text"
                              disabled
                              sx={{
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderRadius: 3.5,
                                border: occupied ? "1px solid rgba(245,158,11,0.28)" : "1px solid rgba(15,23,42,0.08)",
                                bgcolor: occupied ? "rgba(245,158,11,0.08)" : "rgba(19,59,46,0.05)",
                                color: "text.primary",
                                px: 2,
                                py: 1.5,
                                "&.Mui-disabled": {
                                  color: "text.primary",
                                },
                              }}
                            >
                              <Stack spacing={0.3} sx={{ textAlign: "left" }}>
                                <Typography sx={{ fontWeight: 800, fontSize: 15.5 }}>{slot.label}</Typography>
                                <Typography sx={{ fontSize: 12.8, color: "text.secondary" }}>
                                  {occupied ? "Bloco ocupado por reserva ou sobreposição existente." : "Bloco padrão disponível na agenda comum."}
                                </Typography>
                              </Stack>
                              <Chip label={occupied ? "Ocupado" : "Disponível"} color={occupied ? "warning" : "success"} variant={occupied ? "outlined" : "filled"} sx={{ borderRadius: 999, fontWeight: 700 }} />
                            </Button>
                          );
                        })}

                        {!selectedDaySlots.length ? <Typography color="text.secondary">Nenhum bloco exibido para esta data.</Typography> : null}
                      </Stack>

                      <Box sx={{ mt: 2.2, borderTop: "1px solid rgba(15,23,42,0.08)", pt: 1.6 }}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <InfoOutlinedIcon sx={{ color: "text.secondary", fontSize: 18, mt: 0.15 }} />
                          <Typography color="text.secondary" sx={{ fontSize: 13.25 }}>
                            A agenda global reflete conflitos por sobreposição. Horários quebrados continuam disponíveis no controle manual abaixo.
                          </Typography>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Card variant="outlined" sx={{ borderRadius: 6 }}>
                  <CardContent>
                    <Stack direction={{ xs: "column", lg: "row" }} spacing={2} justifyContent="space-between" alignItems={{ lg: "flex-start" }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 900 }}>Compromissos do dia</Typography>
                        <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                          {selectedDateKey ? `Acompanhamento operacional de ${dayjs(selectedDateKey).format("DD/MM/YYYY")}.` : "Selecione uma data para ver os compromissos."}
                        </Typography>

                        <Stack spacing={1.2} sx={{ mt: 2 }}>
                          {selectedDateAppointments.map((appointment) => (
                            <Box key={appointment.id} sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 4, px: 2, py: 1.6 }}>
                              <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between">
                                <Box>
                                  <Typography sx={{ fontWeight: 800 }}>{appointment.form?.user?.name ?? "Cliente"}</Typography>
                                  {appointment.form?.user?.email ? <Typography color="text.secondary">{appointment.form.user.email}</Typography> : null}
                                  <Typography color="text.secondary" sx={{ mt: 0.4 }}>
                                    {dayjs(appointment.startAt).format("HH:mm")} às {dayjs(appointment.endAt).format("HH:mm")}
                                  </Typography>
                                </Box>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} flexWrap="wrap" useFlexGap>
                                  <Chip size="small" label={appointmentStatusLabel(appointment.status)} color={appointment.status === "CONFIRMADO_EQUIPE" || appointment.status === "REALIZADO" ? "success" : "default"} />
                                  <Chip size="small" label={conflictIds.has(appointment.id) ? "Conflito identificado" : "Sem conflito"} color={conflictIds.has(appointment.id) ? "warning" : "success"} />
                                  <Button size="small" variant="outlined" onClick={() => nav(`/admin/forms/${appointment.formId}`)}>
                                    Abrir
                                  </Button>
                                  <Button size="small" variant="outlined" color="success" disabled={appointment.status === "CONFIRMADO_EQUIPE"} onClick={() => statusMutation.mutate({ appointmentId: appointment.id, status: "CONFIRMADO_EQUIPE" })}>
                                    Confirmar
                                  </Button>
                                  <Button size="small" variant="outlined" color="primary" disabled={appointment.status === "REALIZADO"} onClick={() => statusMutation.mutate({ appointmentId: appointment.id, status: "REALIZADO" })}>
                                    Realizado
                                  </Button>
                                  <Button size="small" variant="outlined" color="warning" disabled={appointment.status === "CANCELADO"} onClick={() => statusMutation.mutate({ appointmentId: appointment.id, status: "CANCELADO" })}>
                                    Cancelar
                                  </Button>
                                </Stack>
                              </Stack>
                            </Box>
                          ))}

                          {!selectedDateAppointments.length ? <Typography color="text.secondary">Nenhum agendamento registrado nesta data.</Typography> : null}
                        </Stack>
                      </Box>

                      <Box sx={{ width: { xs: "100%", lg: 380 }, display: "grid", gap: 1.25 }}>
                        <Typography sx={{ fontWeight: 900 }}>Controle manual do admin</Typography>
                        <Typography color="text.secondary" sx={{ fontSize: 14 }}>
                          Use este bloco para criar horários quebrados ou registrar ajustes específicos da operação.
                        </Typography>
                        <TextField
                          select
                          label="Cliente"
                          value={draft.formId}
                          onChange={(event) => setDraft((previous) => ({ ...previous, formId: event.target.value }))}
                        >
                          {forms.map((form) => (
                            <MenuItem key={form.id} value={form.id}>
                              {form.user?.name ?? "Cliente"} | {form.user?.email ?? form.id}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="Início"
                          type="datetime-local"
                          value={draft.startAt}
                          onChange={(event) => setDraft((previous) => ({ ...previous, startAt: event.target.value }))}
                          InputLabelProps={{ shrink: true }}
                        />
                        <TextField
                          label="Fim"
                          type="datetime-local"
                          value={draft.endAt}
                          onChange={(event) => setDraft((previous) => ({ ...previous, endAt: event.target.value }))}
                          InputLabelProps={{ shrink: true }}
                        />
                        <Button variant="contained" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                          Criar horário manual
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
