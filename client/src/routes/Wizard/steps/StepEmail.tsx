import React from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { EmailSetupSchema, type EmailSetupValues } from "../wizardTypes";

const PROVIDERS = [
  "Google Workspace (Gmail)",
  "Microsoft 365 (Outlook)",
  "HostGator",
  "Hostinger",
  "KingHost",
  "Locaweb",
  "Outro",
  "Não sei",
] as const;

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function isEmailValid(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return true;
  return email.includes("@") && email.includes(".com");
}

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
  const selectedProviders = data.providerOptions ?? [];
  const otherSelected = selectedProviders.includes("Outro");
  const unknownSelected = selectedProviders.includes("Não sei");
  const hasProviderSelection = selectedProviders.length > 0;

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

  function toggleProvider(value: string) {
    setData((prev) => {
      const nextProviders = toggleInList(prev.providerOptions ?? [], value);
      return {
        ...prev,
        providerOptions: nextProviders,
        providerOtherText: nextProviders.includes("Outro") ? prev.providerOtherText : "",
        tiContactName: nextProviders.includes("Não sei") ? prev.tiContactName : "",
        tiContactPhone: nextProviders.includes("Não sei") ? prev.tiContactPhone : "",
      };
    });
  }

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Configuração de e-mails e usuários
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Preencha essas informações para orientarmos a implantação do SMTP e o cadastro dos usuários.
        </Typography>

        <Box sx={{ display: "grid", gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>SMTP: qual é o seu provedor de e-mails?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Marque ao menos uma opção. Você pode selecionar mais de uma, se necessário.
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 0.5 }}>
              {PROVIDERS.map((provider) => (
                <FormControlLabel
                  key={provider}
                  control={<Checkbox checked={selectedProviders.includes(provider)} onChange={() => toggleProvider(provider)} />}
                  label={provider}
                  sx={{ m: 0 }}
                />
              ))}
            </Box>

            {!hasProviderSelection ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Selecione uma opção para o provedor de e-mails.
              </Alert>
            ) : null}

            {otherSelected ? (
              <TextField
                fullWidth
                label="Descreva"
                placeholder="Ex.: provedor próprio, revenda, outro serviço"
                sx={{ mt: 1.5 }}
                value={data.providerOtherText ?? ""}
                onChange={(e) => setData((prev) => ({ ...prev, providerOtherText: e.target.value }))}
              />
            ) : null}

            {unknownSelected ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25, mt: 1.5 }}>
                <TextField
                  label="Contato do TI - nome"
                  value={data.tiContactName ?? ""}
                  onChange={(e) => setData((prev) => ({ ...prev, tiContactName: e.target.value }))}
                />
                <TextField
                  label="Contato do TI - telefone"
                  value={data.tiContactPhone ?? ""}
                  onChange={(e) => setData((prev) => ({ ...prev, tiContactPhone: e.target.value }))}
                />
              </Box>
            ) : null}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Relação de usuários</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Informe o nome e o e-mail de cada usuário. O e-mail deve conter ao menos @ e .com.
            </Typography>

            <Box sx={{ display: "grid", gap: 1.25 }}>
              {users.map((u, idx) => {
                const email = u?.email ?? "";
                const invalidEmail = email.trim().length > 0 && !isEmailValid(email);

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
                      gap: 1,
                      alignItems: "start",
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
                      value={email}
                      error={invalidEmail}
                      helperText={invalidEmail ? "Informe um e-mail com @ e .com." : " "}
                      onChange={(e) => updateUser(idx, { email: e.target.value })}
                    />
                    <IconButton
                      aria-label="Remover"
                      onClick={() => removeRow(idx)}
                      disabled={users.length === 1 && !(u?.name || u?.email)}
                      sx={{ mt: { md: 0.75 } }}
                    >
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>

            <Button startIcon={<AddIcon />} onClick={addRow} sx={{ mt: 1.25 }}>
              Adicionar usuário
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
