import React from "react";
import { AppShell } from "../../components/AppShell";
import { Box, Card, CardContent, Stack, Typography, Button, Divider, Chip, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom";

export function AdminDashboardPage() {
  const nav = useNavigate();

  const q = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => (await api.get("/api/admin/stats")).data,
  });

  const stats = q.data?.stats;

  return (
    <AppShell title="Admin • Visão Geral">
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Visão Geral
          </Typography>
          <Typography color="text.secondary">
            Acompanhe rapidamente o volume de formulários e acesse as principais telas.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => nav("/admin/forms")}>
            Ver formulários
          </Button>
          <Button variant="outlined" component="a" href="/api/admin/forms.csv" target="_blank" rel="noreferrer">
            Exportar CSV
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary">Total</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {q.isLoading ? <Skeleton width={90} /> : (stats?.total ?? 0)}
            </Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Rascunho: ${q.isLoading ? "—" : (stats?.draft ?? 0)}`} />
              <Chip color="success" label={`Enviado: ${q.isLoading ? "—" : (stats?.submitted ?? 0)}`} />
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography color="text.secondary">Últimos 7 dias</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              {q.isLoading ? <Skeleton width={90} /> : (stats?.last7d ?? 0)}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Formulários atualizados recentemente.
            </Typography>
          </CardContent>
        </Card>
      </Stack>

      <Card>
        <CardContent>
          <Typography sx={{ fontWeight: 900, mb: 1 }}>Atalhos</Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" onClick={() => nav("/admin/forms")}>Formulários recebidos</Button>
            <Button variant="outlined" onClick={() => nav("/")}>Início</Button>
          </Stack>
        </CardContent>
      </Card>
    </AppShell>
  );
}
