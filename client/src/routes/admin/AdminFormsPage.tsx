import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "../../lib/dayjs";
import { api } from "../../lib/api";
import { AppShell } from "../../components/AppShell";
import type { OnboardingForm } from "../../types";

function stageLabel(stageKey?: string) {
  return {
    ETAPA_01: "Etapa 01",
    ETAPA_02: "Etapa 02",
    ETAPA_03: "Etapa 03",
  }[stageKey ?? "ETAPA_01"] ?? "Etapa 01";
}

function stageStatusLabel(status?: string) {
  return {
    NAO_INICIADA: "Não iniciada",
    EM_PREENCHIMENTO: "Em preenchimento",
    ENVIADA_PELO_CLIENTE: "Enviada pelo cliente",
    EM_ANALISE_IMPLANTACAO: "Em análise pela implantação",
    AJUSTE_NECESSARIO: "Ajuste necessário",
    TREINAMENTO_AGENDADO: "Treinamento agendado",
    TREINAMENTO_REALIZADO: "Treinamento realizado",
    AGUARDANDO_ACEITE_CONCLUSAO: "Aguardando aceite de conclusão",
    CONCLUIDA: "Concluída",
    PROXIMA_ETAPA_DISPONIVEL: "Próxima etapa disponível",
  }[status ?? "NAO_INICIADA"] ?? status ?? "Não iniciada";
}

function trainingStatusLabel(status?: string) {
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

export function AdminFormsPage() {
  const nav = useNavigate();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [currentStage, setCurrentStage] = React.useState("");
  const [trainingStatus, setTrainingStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const query = useQuery({
    queryKey: ["adminForms", { search, status, currentStage, trainingStatus, page, pageSize }],
    queryFn: async () =>
      (
        await api.get("/api/admin/forms", {
          params: {
            search: search || undefined,
            status: status || undefined,
            currentStage: currentStage || undefined,
            trainingStatus: trainingStatus || undefined,
            page,
            pageSize,
          },
        })
      ).data as { total: number; page: number; pageSize: number; forms: (OnboardingForm & { currentStageKey?: string; stageStatus?: string; trainingStatus?: string })[] },
    staleTime: 30_000,
  });

  const forms = query.data?.forms ?? [];
  const total = query.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <AppShell title="Admin • Clientes em trilha">
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ lg: "center" }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Clientes em trilha
                </Typography>
                <Typography color="text.secondary">
                  {query.isLoading ? "Carregando..." : `${total} registro(s) para acompanhamento operacional.`}
                </Typography>
              </Box>

              <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ width: { xs: "100%", lg: "auto" } }}>
                <TextField
                  size="small"
                  placeholder="Buscar por nome ou e-mail"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: { md: 260 } }}
                />
                <TextField
                  select
                  size="small"
                  label="Etapa"
                  value={currentStage}
                  onChange={(event) => {
                    setCurrentStage(event.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  <MenuItem value="ETAPA_01">Etapa 01</MenuItem>
                  <MenuItem value="ETAPA_02">Etapa 02</MenuItem>
                  <MenuItem value="ETAPA_03">Etapa 03</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Treinamento"
                  value={trainingStatus}
                  onChange={(event) => {
                    setTrainingStatus(event.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 210 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="NAO_DISPONIVEL">Não disponível</MenuItem>
                  <MenuItem value="DISPONIVEL_AGENDAMENTO">Disponível para agendamento</MenuItem>
                  <MenuItem value="RESERVADO">Reservado</MenuItem>
                  <MenuItem value="CONFIRMADO_EQUIPE">Confirmado pela equipe</MenuItem>
                  <MenuItem value="REAGENDADO">Reagendado</MenuItem>
                  <MenuItem value="REALIZADO">Realizado</MenuItem>
                  <MenuItem value="CANCELADO">Cancelado</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Formulário"
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="RASCUNHO">Rascunho</MenuItem>
                  <MenuItem value="ENVIADO">Enviado</MenuItem>
                </TextField>
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Nome do cliente</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>E-mail</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Etapa atual</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status da etapa</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status do treinamento</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Última atualização</TableCell>
                    <TableCell sx={{ fontWeight: 800 }} align="right">
                      Ação
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id} hover>
                      <TableCell>{form.user?.name ?? form.id}</TableCell>
                      <TableCell>{form.user?.email ?? ""}</TableCell>
                      <TableCell>{stageLabel((form as any).currentStageKey)}</TableCell>
                      <TableCell>{stageStatusLabel((form as any).stageStatus)}</TableCell>
                      <TableCell>{trainingStatusLabel((form as any).trainingStatus)}</TableCell>
                      <TableCell>{form.updatedAt ? dayjs(form.updatedAt).format("DD/MM/YYYY HH:mm") : ""}</TableCell>
                      <TableCell align="right">
                        <Button size="small" variant="outlined" onClick={() => nav(`/admin/forms/${form.id}`)}>
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!query.isLoading && forms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <Typography color="text.secondary">Nenhum cliente encontrado com os filtros atuais.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" alignItems={{ sm: "center" }} sx={{ mt: 2 }}>
              <Typography color="text.secondary">
                Página {page} de {pageCount}
              </Typography>
              <Pagination page={page} count={pageCount} onChange={(_, value) => setPage(value)} color="primary" />
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}
