import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "../../components/AppShell";
import { api } from "../../lib/api";

type UserRole = "ADMIN" | "CLIENT";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
};

export function AdminUsersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qText, setQText] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CLIENT" as UserRole,
  });

  const usersQ = useQuery({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const res = await api.get("/api/admin/users");
      const data = res.data;
      const users = Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : [];
      return users as UserRow[];
    },
    retry: 0,
  });

  const createM = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      };
      const res = await api.post("/api/admin/users", payload);
      return res.data as { user: UserRow };
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "CLIENT" });
      qc.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });

  const users = usersQ.data ?? [];

  const filtered = useMemo(() => {
    const t = qText.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) => {
      const hay = `${u.name ?? ""} ${u.email ?? ""} ${u.id ?? ""}`.toLowerCase();
      return hay.includes(t);
    });
  }, [users, qText]);

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.email.trim().includes("@") &&
    form.password.length >= 6 &&
    (form.role === "ADMIN" || form.role === "CLIENT");

  return (
    <AppShell title="Admin • Usuários">
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
                Usuários
              </Typography>
              <Typography color="text.secondary">
                {usersQ.isLoading ? "Carregando..." : `${filtered.length} usuário(s)`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                placeholder="Buscar..."
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                sx={{ width: { xs: 180, sm: 260 } }}
                disabled={usersQ.isError}
              />
              <Button variant="contained" onClick={() => setOpen(true)}>
                Novo usuário
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          {usersQ.isError ? (
            <Typography color="text.secondary">
              A listagem não está disponível (provavelmente seu backend ainda não tem <b>GET /api/admin/users</b>).
              <br />
              Você ainda pode criar usuários clicando em <b>Novo usuário</b>.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {filtered.map((u) => (
                <Card key={u.id} variant="outlined">
                  <CardContent>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 800 }}>{u.name}</Typography>
                        <Typography color="text.secondary">{u.email}</Typography>
                      </Box>
                      <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
                        {u.role}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}

              {!usersQ.isLoading && filtered.length === 0 ? (
                <Typography color="text.secondary">Nenhum usuário encontrado.</Typography>
              ) : null}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar novo usuário</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="E-mail"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              fullWidth
              helperText="Mínimo 6 caracteres"
            />

            <TextField
              label="Perfil"
              select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as UserRole }))}
              fullWidth
            >
              <MenuItem value="CLIENT">Cliente</MenuItem>
              <MenuItem value="ADMIN">Admin</MenuItem>
            </TextField>

            {createM.isError ? (
              <Typography color="error">
                Erro ao criar usuário:{" "}
                {(createM.error as any)?.response?.data?.message ??
                  (createM.error as any)?.message ??
                  "ver console"}
              </Typography>
            ) : null}

            {createM.isSuccess ? (
              <Typography color="success.main">Usuário criado com sucesso.</Typography>
            ) : null}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={createM.isPending || !canSubmit} onClick={() => createM.mutate()}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </AppShell>
  );
}