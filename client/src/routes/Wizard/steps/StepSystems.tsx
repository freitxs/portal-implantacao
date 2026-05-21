import React from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  SystemsPageDraftSchema,
  type SystemsPageDraftValues,
} from "../wizardTypes";

type CategoryKey = keyof SystemsPageDraftValues["systems"];

const ERP_OPTIONS = ["Domínio", "Questor", "SCI", "Alterdata", "IOB", "Fortes", "Contmatic", "Mastermaq", "Outro"];
const ERP_ENVIRONMENT_OPTIONS = [
  { value: "WEB_CLOUD", label: "Web/Cloud" },
  { value: "SERVIDOR_PROPRIO", label: "Servidor próprio" },
  { value: "SERVIDOR_REMOTO", label: "Servidor remoto" },
] as const;

const CATEGORIES: Array<{
  key: CategoryKey;
  title: string;
  options: string[];
  otherLabel?: string;
}> = [
  {
    key: "capturaArmazenamento",
    title: "Captura/armazenamento fiscal",
    options: ["SIEG", "Jettax", "Q-Drive", "Arquivei", "Klaus", "Espião", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "cnd",
    title: "Gestão de CND/certidões",
    options: ["Questor CND", "Veri", "SIEG IriS", "Dootax CND", "suaCND.com", "Monitor Contábil", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "financeiroBpo",
    title: "Financeiro/BPO",
    options: ["Omie", "Conta Azul", "Questor Negócio", "Nibo", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "bi",
    title: "BI",
    options: ["HubCount", "Nucont", "Power BI", "Dattos", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "conciliacaoContabil",
    title: "Conciliação",
    options: ["Sittax", "Mister Contador", "SS Parisi", "Ottimizza", "Conciliador Contábil", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "auditoriaConsultoriaAutomacao",
    title: "Auditoria/automação",
    options: ["Sittax", "E-auditoria", "IOB", "Econect", "Kolossus", "AFD Questor", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "gestaoProcessos",
    title: "Gestão de processos",
    options: ["Acessórias", "G-Click", "Tareffa", "Ottimizza.Tareffa", "Outro"],
    otherLabel: "Informe a solução complementar",
  },
  {
    key: "outrosSistemas",
    title: "Outros definidos no sistema",
    options: ["CRM comercial", "Assinatura eletrônica", "Portal do cliente", "Comunicação interna", "Outro"],
    otherLabel: "Informe o sistema complementar",
  },
];

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function normalizeOtherValues(values: string[]) {
  return values.map((value) => (value === "OUTRO" ? "Outro" : value));
}

function CategoryCard({
  title,
  values,
  options,
  otherText,
  onToggle,
  onChangeOther,
  otherLabel,
}: {
  title: string;
  values: string[];
  options: string[];
  otherText?: string;
  onToggle: (value: string) => void;
  onChangeOther: (value: string) => void;
  otherLabel?: string;
}) {
  const otherSelected = values.includes("Outro");

  return (
    <Box
      sx={{
        backgroundColor: "rgba(255,255,255,0.72)",
        border: "1.5px solid rgba(16,24,40,0.14)",
        borderRadius: 4,
        display: "flex",
        flexDirection: "column",
        gap: 1.75,
        minHeight: "100%",
        p: { xs: 2.4, sm: 2.75 },
      }}
    >
      <Typography sx={{ fontSize: { xs: 15, sm: 17 }, fontWeight: 900, lineHeight: 1.25, maxWidth: 220, pl: 0.2 }}>
        {title}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1.75, rowGap: 0.7, pl: 0.2 }}>
        {options.map((option) => (
          <FormControlLabel
            key={option}
            control={<Checkbox checked={values.includes(option)} onChange={() => onToggle(option)} />}
            label={option}
            slotProps={{
              typography: {
                sx: {
                  fontSize: 13.25,
                  lineHeight: 1.4,
                  overflowWrap: "anywhere",
                },
              },
            }}
            sx={{ m: 0, alignItems: "flex-start", pr: 1, pl: 0.1 }}
          />
        ))}
      </Box>

      {otherSelected ? (
        <TextField
          fullWidth
          label={otherLabel ?? "Informe o item"}
          value={otherText ?? ""}
          onChange={(event) => onChangeOther(event.target.value)}
        />
      ) : null}
    </Box>
  );
}

export function StepSystems({
  defaultValues,
  onAutoSave,
  onDraftChange,
}: {
  defaultValues: any;
  onAutoSave: (data: SystemsPageDraftValues) => void;
  onDraftChange?: (data: SystemsPageDraftValues) => void;
}) {
  const normalizeDraft = React.useCallback((input: any) => {
    const parsedDefaultValues = SystemsPageDraftSchema.parse(input ?? {});
    return {
      ...parsedDefaultValues,
      systems: Object.fromEntries(
        Object.entries(parsedDefaultValues.systems).map(([key, value]) => [
          key,
          { ...value, values: normalizeOtherValues(value.values ?? []) },
        ])
      ) as SystemsPageDraftValues["systems"],
    };
  }, []);
  const [data, setData] = React.useState<SystemsPageDraftValues>(() => normalizeDraft(defaultValues));
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

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Sistemas e soluções utilizadas
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Essas informações são essenciais para a elaboração dos pacotes de benefícios, configuração do painel de honorários e integrações com demais sistemas.
        </Typography>

        <Box sx={{ border: "1.5px solid rgba(16,24,40,0.14)", borderRadius: 4, p: { xs: 2.4, md: 2.8 } }}>
          <Typography sx={{ fontWeight: 900, mb: 1.2, pl: 0.2 }}>ERP Contábil</Typography>
          <FormControl sx={{ width: "100%" }}>
            <RadioGroup
              value={data.systems.erpContabil.values[0] ?? ""}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  systems: {
                    ...prev.systems,
                    erpContabil: {
                      ...prev.systems.erpContabil,
                      values: event.target.value ? [event.target.value] : [],
                      otherText: event.target.value === "Outro" ? prev.systems.erpContabil.otherText : "",
                    },
                  },
                }))
              }
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 2.5, rowGap: 0.8, pl: 0.2 }}
            >
              {ERP_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                  slotProps={{
                    typography: {
                      sx: {
                        fontSize: 13.25,
                        lineHeight: 1.4,
                        overflowWrap: "anywhere",
                      },
                    },
                  }}
                  sx={{ m: 0, pr: 0.75, pl: 0.1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>

          {data.systems.erpContabil.values.includes("Outro") ? (
            <TextField
              fullWidth
              label="Informe o ERP contábil"
              sx={{ mt: 1.5 }}
              value={data.systems.erpContabil.otherText ?? ""}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  systems: {
                    ...prev.systems,
                    erpContabil: { ...prev.systems.erpContabil, otherText: event.target.value },
                  },
                }))
              }
            />
          ) : null}
        </Box>

        <Box sx={{ border: "1.5px solid rgba(16,24,40,0.14)", borderRadius: 4, p: { xs: 2.4, md: 2.8 }, mt: 2.2 }}>
          <Typography sx={{ fontWeight: 900, mb: 1.2, pl: 0.2 }}>Ambiente do ERP</Typography>
          <FormControl sx={{ width: "100%" }}>
            <RadioGroup
              value={data.erpEnvironment ?? ""}
              onChange={(event) =>
                setData((prev) => ({
                  ...prev,
                  erpEnvironment: event.target.value as SystemsPageDraftValues["erpEnvironment"],
                }))
              }
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" }, columnGap: 2, rowGap: 0.8, pl: 0.2 }}
            >
              {ERP_ENVIRONMENT_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  label={option.label}
                  slotProps={{
                    typography: {
                      sx: {
                        fontSize: 13.25,
                        lineHeight: 1.4,
                      },
                    },
                  }}
                  sx={{ m: 0, pr: 0.75, pl: 0.1 }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>

        <Divider sx={{ my: 3.2 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.25 }}>
          Soluções complementares por categoria
        </Typography>

        <Box sx={{ display: "grid", gap: 2.4, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category.key}
              title={category.title}
              options={category.options}
              values={data.systems[category.key].values}
              otherText={data.systems[category.key].otherText}
              otherLabel={category.otherLabel}
              onToggle={(value) =>
                setData((prev) => {
                  const nextValues = toggleInList(prev.systems[category.key].values, value);
                  return {
                    ...prev,
                    systems: {
                      ...prev.systems,
                      [category.key]: {
                        ...prev.systems[category.key],
                        values: nextValues,
                        otherText: nextValues.includes("Outro") ? prev.systems[category.key].otherText : "",
                      },
                    },
                  };
                })
              }
              onChangeOther={(value) =>
                setData((prev) => ({
                  ...prev,
                  systems: {
                    ...prev.systems,
                    [category.key]: { ...prev.systems[category.key], otherText: value },
                  },
                }))
              }
            />
          ))}
        </Box>

        <Divider sx={{ my: 3.2 }} />

        <Stack spacing={1.25}>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>
            Observações complementares
          </Typography>
          <Typography color="text.secondary">
            Utilize este campo apenas se houver alguma particularidade importante do ambiente atual.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Ex.: integração própria, política interna de acesso ou observação operacional."
            value={data.systemsComment ?? ""}
            onChange={(event) => setData((prev) => ({ ...prev, systemsComment: event.target.value }))}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
