import React from "react";
import { AppShell } from "../components/AppShell";
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import dayjs from "../lib/dayjs";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";

export function MyFormsPage() {
  const nav = useNavigate();
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ["myForms"],
    queryFn: async () => (await api.get("/api/forms/my")).data.forms as any[],
  });

  async function copyForm(formId: string) {
    try {
      const { data } = await api.post(`/api/forms/${formId}/copy`);
      nav(`/wizard/${data.formId}`);
    } catch (err: any) {
      toast({ message: err?.response?.data?.message ?? "Não foi possível copiar.", severity: "error" });
    }
  }

  async function createOrGetDraft() {
    try {
      const { data } = await api.post("/api/forms");
      nav(`/wizard/${data.formId}`);
    } catch (err: any) {
      toast({ message: err?.response?.data?.message ?? "Não foi possível iniciar.", severity: "error" });
    }
  }

  return (
    <AppShell title="Jornada de Implantação">
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">Meus Formulários</Typography>
          <Typography color="text.secondary">Retome de onde parou ou veja o resumo do que já foi enviado.</Typography>
        </Box>
        <Button variant="contained" onClick={createOrGetDraft}>Novo / Continuar Rascunho</Button>
      </Stack>

      <Box sx={{ display: "grid", gap: 2 }}>
        {(q.data ?? []).map((f) => (
          <Card key={f.id}>
            <CardContent sx={{ display: "grid", gap: 1.2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 800 }}>Formulário</Typography>
                <Chip label={f.status === "ENVIADO" ? "Enviado" : "Rascunho"} color={f.status === "ENVIADO" ? "success" : "default"} size="small" />
              </Stack>

              <Typography color="text.secondary">
                Criado em {dayjs(f.createdAt).format("DD/MM/YYYY HH:mm")} • Última atualização {dayjs(f.updatedAt).fromNow?.() ?? dayjs(f.updatedAt).format("DD/MM/YYYY HH:mm")}
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                {f.status === "RASCUNHO" ? (
                  <Button variant="outlined" onClick={() => nav(`/wizard/${f.id}`)}>Continuar</Button>
                ) : (
                  <Button variant="outlined" onClick={() => nav(`/resumo/${f.id}`)}>Ver resumo</Button>
                )}

                <Button variant="outlined" onClick={() => copyForm(f.id)}>Editar</Button>
              </Stack>
            </CardContent>
          </Card>
        ))}

        {q.data?.length === 0 && (
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Ainda não há formulários.</Typography>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                Clique em “Novo / Continuar Rascunho” para iniciar a jornada.
              </Typography>
              <Button variant="contained" onClick={createOrGetDraft}>Começar</Button>
            </CardContent>
          </Card>
        )}
      </Box>
    </AppShell>
  );
}
