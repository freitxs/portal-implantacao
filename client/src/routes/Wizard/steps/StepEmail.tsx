import React from "react";
import { Alert, Box, Button, Card, CardContent, Checkbox, Divider, FormControlLabel, IconButton, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { EmailSetupSchema, type EmailSetupValues } from "../wizardTypes";

const PROVIDERS = ["Google Workspace (Gmail)", "Microsoft 365 (Outlook)", "HostGator", "Hostinger", "KingHost", "Locaweb", "Outro", "Não sei"] as const;

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
  onDraftChange,
}: {
  defaultValues: any;
  onAutoSave: (data: EmailSetupValues) => void;
  onDraftChange?: (data: EmailSetupValues) => void;
}) {
  const normalizeDraft = React.useCallback((input: any) => EmailSetupSchema.parse(input ?? {}), []);
  const [data, setData] = React.useState<EmailSetupValues>(() => normalizeDraft(defaultValues));
  const initialSerializedRef = React.useRef(JSON.stringify(normalizeDraft(defaultValues)));
  const lastLoadedRef = React.useRef(initialSerializedRef.current);
  const lastSavedRef = React.useRef(initialSerializedRef.current);

  React.useEffect(() => {
    const next = normalizeDraft(defaultValues);
    const serialized = JSON.stringify(next);
    if (serialized !== lastLoadedRef.current) {
      lastLoadedRef.current = serialized;
      lastSavedRef.current = serialized;
      setData(next);
    }
  }, [defaultValues, normalizeDraft]);

  React.useEffect(() => {
    const normalized = normalizeDraft(data);
    const serialized = JSON.stringify(normalized);
    onDraftChange?.(normalized);
    if (serialized !== lastSavedRef.current) {
      lastSavedRef.current = serialized;
      onAutoSave(normalized);
    }
  }, [data, normalizeDraft, onAutoSave, onDraftChange]);

  const users = Array.isArray(data.users) ? data.users : [];
  const selectedProviders = data.providerOptions ?? [];
  const otherSelected = selectedProviders.includes("Outro");
  const unknownSelected = selectedProviders.includes("Não sei");
  const hasProviderSelection = selectedProviders.length > 0;

  type UserRow = {
    name?: string;
    email?: string;
    roleOrFunction?: string;
    attendsTraining?: boolean;
    isEnvironmentAdmin?: boolean;
  };

  function updateUser(index: number, patch: Partial<UserRow>) {
    setData((prev) => {
      const next = { ...prev };
      const list = [...(next.users ?? [])];
      list[index] = {
        ...(list[index] ?? {
          name: "",
          email: "",
          roleOrFunction: "",
          attendsTraining: false,
          isEnvironmentAdmin: false,
        }),
        ...patch,
      };
      next.users = list;
      return next;
    });
  }

  function addRow() {
    setData((prev) => ({
      ...prev,
      users: [
        ...(prev.users ?? []),
        {
          name: "",
          email: "",
          roleOrFunction: "",
          attendsTraining: false,
          isEnvironmentAdmin: false,
        },
      ],
    }));
  }

  function removeRow(index: number) {
    setData((prev) => {
      const list = [...(prev.users ?? [])].filter((_, i) => i !== index);
      return {
        ...prev,
        users: list.length
          ? list
          : [
              {
                name: "",
                email: "",
                roleOrFunction: "",
                attendsTraining: false,
                isEnvironmentAdmin: false,
              },
            ],
      };
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
          E-mails e usuários
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Informe o provedor de e-mail e os usuários iniciais do ambiente.
        </Typography>

        <Box sx={{ display: "grid", gap: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Qual é o provedor de e-mail?</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Você pode marcar mais de uma opção, se necessário.
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.35 }}>
              {PROVIDERS.map((provider) => (
                <FormControlLabel
                  key={provider}
                  control={<Checkbox checked={selectedProviders.includes(provider)} onChange={() => toggleProvider(provider)} />}
                  label={provider}
                  slotProps={{
                    typography: {
                      sx: {
                        fontSize: 13.25,
                        lineHeight: 1.4,
                        overflowWrap: "anywhere",
                      },
                    },
                  }}
                  sx={{ m: 0, pr: 0.5, alignItems: "flex-start" }}
                />
              ))}
            </Box>

            {!hasProviderSelection ? (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                Selecione ao menos uma opção.
              </Alert>
            ) : null}

            {otherSelected ? (
              <TextField
                fullWidth
                label="Descreva"
                placeholder="Ex.: provedor próprio ou outro serviço"
                sx={{ mt: 1.5 }}
                value={data.providerOtherText ?? ""}
                onChange={(e) => setData((prev) => ({ ...prev, providerOtherText: e.target.value }))}
              />
            ) : null}

            {unknownSelected ? (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1.25, mt: 1.5 }}>
                <TextField label="Contato do TI - nome" value={data.tiContactName ?? ""} onChange={(e) => setData((prev) => ({ ...prev, tiContactName: e.target.value }))} />
                <TextField label="Contato do TI - telefone" value={data.tiContactPhone ?? ""} onChange={(e) => setData((prev) => ({ ...prev, tiContactPhone: e.target.value }))} />
              </Box>
            ) : null}
          </Box>

          <Divider sx={{ my: 1 }} />

          <Box>
            <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Usuários iniciais</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Informe nome e e-mail de cada usuário.
            </Typography>

            <Box sx={{ display: "grid", gap: 1.25 }}>
              {users.map((u, idx) => {
                const email = u?.email ?? "";
                const invalidEmail = email.trim().length > 0 && !isEmailValid(email);

                return (
                  <Box key={idx} sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1, alignItems: "start" }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr auto" },
                        gap: 1,
                        alignItems: "start",
                      }}
                    >
                      <TextField label="Nome" value={u?.name ?? ""} onChange={(e) => updateUser(idx, { name: e.target.value })} />
                      <TextField
                        label="E-mail"
                        type="email"
                        value={email}
                        error={invalidEmail}
                        helperText={invalidEmail ? "Informe um e-mail válido." : " "}
                        onChange={(e) => updateUser(idx, { email: e.target.value })}
                      />
                      <IconButton aria-label="Remover" onClick={() => removeRow(idx)} disabled={users.length === 1 && !(u?.name || u?.email || u?.roleOrFunction)} sx={{ mt: { md: 0.75 } }}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Box>

                    <TextField label="Cargo/função" value={u?.roleOrFunction ?? ""} onChange={(e) => updateUser(idx, { roleOrFunction: e.target.value })} />

                    <Stack direction={{ xs: "column", md: "row" }} spacing={0.5}>
                      <FormControlLabel
                        control={<Checkbox checked={Boolean(u?.attendsTraining)} onChange={(_, checked) => updateUser(idx, { attendsTraining: checked })} />}
                        label="Participará do treinamento"
                        slotProps={{ typography: { sx: { fontSize: 13.25 } } }}
                      />
                      <FormControlLabel
                        control={<Checkbox checked={Boolean(u?.isEnvironmentAdmin)} onChange={(_, checked) => updateUser(idx, { isEnvironmentAdmin: checked })} />}
                        label="Administrador do ambiente"
                        slotProps={{ typography: { sx: { fontSize: 13.25 } } }}
                      />
                    </Stack>
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
