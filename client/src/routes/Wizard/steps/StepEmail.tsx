import React from "react";
import { Box, Button, Card, CardContent, Divider, IconButton, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { EmailSetupSchema, type EmailSetupValues } from "../wizardTypes";

export function StepEmail({
  defaultValues,
  onAutoSave,
}: {
  defaultValues: any;
  onAutoSave: (data: EmailSetupValues) => void;
}) {
  const initial = EmailSetupSchema.parse(defaultValues ?? {});
  const [data, setData] = React.useState<EmailSetupValues>(initial);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const ok = EmailSetupSchema.safeParse(data);
      if (ok.success) onAutoSave(ok.data);
    }, 700);
    return () => clearTimeout(t);
  }, [JSON.stringify(data)]);

  const users = Array.isArray(data.users) ? data.users : [];

  type UserRow = { name?: string; email?: string };

  function updateUser(index: number, patch: Partial<UserRow>) {
    setData((prev) => {
      const next = { ...prev };
      const list = [...(next.users ?? [])];
      list[index] = { ...(list[index] ?? { name: "", email: "" }), ...patch };
      next.users = list;
      return next;
    });
  }

  function addRow() {
    setData((prev) => ({ ...prev, users: [...(prev.users ?? []), { name: "", email: "" }] }));
  }

  function removeRow(index: number) {
    setData((prev) => {
      const list = [...(prev.users ?? [])].filter((_, i) => i !== index);
      return { ...prev, users: list.length ? list : [{ name: "", email: "" }] };
    });
  }

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Configuração de e-mail e usuários
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Precisamos dessas informações para cadastrar os usuários e orientar a configuração do envio de e-mails.
        </Typography>

        <Box sx={{ display: "grid", gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Qual é o provedor de e-mail do seu escritório?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Exemplos: Google Workspace (Gmail), Microsoft 365 (Outlook), HostGator, Hostinger, KingHost, Locaweb.
            </Typography>

            <TextField
              fullWidth
              label="Provedor de e-mail"
              placeholder="Ex.: Google Workspace"
              value={data.emailProvider ?? ""}
              onChange={(e) => setData((p) => ({ ...p, emailProvider: e.target.value }))}
            />
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Quais usuários você deseja cadastrar no sistema?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Informe o nome e o e-mail de cada usuário. Você pode adicionar quantas linhas precisar.
            </Typography>

            <Box sx={{ display: "grid", gap: 1.25 }}>
              {users.map((u, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
                    gap: 1,
                    alignItems: "center",
                  }}
                >
                  <TextField
                    label="Nome"
                    value={u?.name ?? ""}
                    onChange={(e) => updateUser(idx, { name: e.target.value })}
                  />
                  <TextField
                    label="E-mail"
                    type="email"
                    value={u?.email ?? ""}
                    onChange={(e) => updateUser(idx, { email: e.target.value })}
                  />
                  <IconButton
                    aria-label="Remover"
                    onClick={() => removeRow(idx)}
                    disabled={users.length === 1 && !(u?.name || u?.email)}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>

            <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1.25 }}>
              Adicionar usuário
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Dica: se você ainda não tem todos os e-mails, pode preencher depois — mas quanto mais completo, melhor.
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
