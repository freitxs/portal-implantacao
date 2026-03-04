import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "../../lib/dayjs";
import { api } from "../../lib/api";
import { AppShell } from "../../components/AppShell";

type AnyForm = any;

function safeString(v: any) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  return String(v);
}

function getUserNameEmail(form: AnyForm) {
  const name = safeString(form?.user?.name || form?.userName || form?.user?.fullName);
  const email = safeString(form?.user?.email || form?.userEmail);
  if (name && email) return `${name} • ${email}`;
  return name || email || "—";
}

function getUpdatedAt(form: AnyForm) {
  const dt = form?.updatedAt || form?.createdAt;
  return dt ? dayjs(dt).format("DD/MM/YYYY HH:mm") : "—";
}

function countSelections(form: AnyForm) {
  const p1 = form?.stepData?.page1 ?? {};
  const systems = p1?.systems ?? {};

  const categories = [
    "erpContabil",
    "capturaArmazenamento",
    "gestaoProcessos",
    "bi",
    "cnd",
    "auditoriaConsultoriaAutomacao",
    "conciliacaoContabil",
    "financeiroBpo",
  ];

  let total = 0;
  for (const k of categories) {
    const arr = systems?.[k]?.values;
    if (Array.isArray(arr)) total += arr.length;
  }

  const p2 = form?.stepData?.page2 ?? {};
  const services = p2?.servicesOffered;
  if (Array.isArray(services)) total += services.length;

  const factors = p2?.pricingFactors;
  if (Array.isArray(factors)) total += factors.length;

  const motivation = safeString(p2?.motivation).trim();
  if (motivation) total += 1;

  return total;
}

export function AdminFormsPage() {
  const nav = useNavigate();
  const [qText, setQText] = useState("");

  const q = useQuery({
    queryKey: ["adminForms"],
    queryFn: async () => {
      const res = await api.get("/api/admin/forms");
      const data = res.data;

      const forms = Array.isArray(data) ? data : Array.isArray(data?.forms) ? data.forms : [];
      return forms as AnyForm[];
    },
  });

  const forms = q.data ?? [];

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return forms;
    return forms.filter((f) => {
      const hay =
        [
          safeString(f?.id),
          safeString(f?.user?.name),
          safeString(f?.user?.email),
          safeString(f?.userName),
          safeString(f?.userEmail),
        ]
          .join(" ")
          .toLowerCase() || "";
      return hay.includes(t);
    });
  }, [forms, qText]);

  return (
    <AppShell title="Admin • Formulários">
      <Stack spacing={2}>
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 900 }}>
                  Formulários
                </Typography>
                <Typography color="text.secondary">
                  {q.isLoading ? "Carregando..." : `${filtered.length} encontrado(s)`}
                </Typography>
              </Box>

              <TextField
                size="small"
                placeholder="Buscar por nome, e-mail ou ID..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                sx={{ minWidth: { sm: 340 } }}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            {q.isError ? (
              <Typography color="error">
                Erro ao carregar formulários. Verifique o console/network (provável 401/500).
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Cliente</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Atualizado</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Respostas</TableCell>
                    <TableCell sx={{ fontWeight: 800, width: 160 }} align="right">
                      Ações
                    </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filtered.map((form) => (
                    <TableRow key={form.id} hover>
                      <TableCell>{getUserNameEmail(form)}</TableCell>
                      <TableCell>{getUpdatedAt(form)}</TableCell>
                      <TableCell>{countSelections(form)}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => nav(`/admin/forms/${form.id}`)}
                        >
                          Ver formulário
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!q.isLoading && filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <Typography color="text.secondary">Nenhum formulário encontrado.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Stack>
    </AppShell>
  );
}