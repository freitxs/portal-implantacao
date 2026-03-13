import React from "react";
import { Box, Card, CardContent, Checkbox, Divider, FormControlLabel, TextField, Typography } from "@mui/material";
import { SystemsPageSchema, type SystemsPageValues } from "../wizardTypes";

type CategoryKey = keyof SystemsPageValues["systems"];

const CATEGORIES: Array<{
  key: CategoryKey;
  title: string;
  options: string[];
  otherLabel?: string;
}> = [
  {
    key: "erpContabil",
    title: "ERP Contábil",
    options: ["Dominio", "Questor", "SCI", "Alterdata", "IOB", "Fortes", "Contmatic", "Mastermac", "OUTRO"],
    otherLabel: "Descreva qual ERP",
  },
  {
    key: "cnd",
    title: "Controle de certidões negativas (CND) e regularidade",
    options: ["Questor CND", "Veri", "SIEG IriS", "Dootax CND", "suaCND.com", "IOB CND", "SCI Report CND", "Monitor Contábil", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "capturaArmazenamento",
    title: "Captura e armazenamento de documentos fiscais eletrônicos",
    options: ["SIEG", "Jettax", "Q-Drive", "Arquivei", "Espião", "Klaus", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "conciliacaoContabil",
    title: "Conciliação Contábil",
    options: ["Sittax", "Mister Contador", "SS Parisi", "Escritório Inteligente (Integra Fácil)", "Conciliador Contábil", "Ottimizza", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "gestaoProcessos",
    title: "Gestão de processos e obrigações acessórias",
    options: ["Acessórias", "G-Click (hoje Omie.G-Click)", "Tareffa", "Ottimizza.Tareffa", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "bi",
    title: "BI",
    options: ["HubCount", "Nucont", "Power BI", "Dattos", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "auditoriaConsultoriaAutomacao",
    title: "Auditoria, Consultoria e Automação",
    options: ["Sittax", "E-auditoria", "IOB", "Econect", "Dattos", "Kolossus", "AFD Questor", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
  {
    key: "financeiroBpo",
    title: "Financeiro / BPO financeiro / ERP financeiro",
    options: ["Omie", "Conta Azul", "Questor Negócio", "Nibo", "OUTRO"],
    otherLabel: "Descreva qual solução",
  },
];

const ROWS: CategoryKey[][] = [
  ["erpContabil", "cnd"],
  ["capturaArmazenamento", "conciliacaoContabil"],
  ["gestaoProcessos", "bi"],
  ["auditoriaConsultoriaAutomacao", "financeiroBpo"],
];

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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
  const otherSelected = values.includes("OUTRO");

  return (
    <Box
      sx={{
        border: "1.5px solid rgba(16,24,40,0.16)",
        borderRadius: 4,
        p: 2.25,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        backgroundColor: "rgba(255,255,255,0.72)",
        minHeight: "100%",
        boxShadow: "0 2px 16px rgba(15,23,42,0.04)",
      }}
    >
      <Typography sx={{ fontWeight: 900, fontSize: { xs: 16, sm: 18 }, lineHeight: 1.2 }}>{title}</Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
          columnGap: 2.5,
          rowGap: 0.75,
          alignContent: "start",
        }}
      >
        {options.map((opt) => (
          <FormControlLabel
            key={opt}
            labelPlacement="end"
            sx={{
              m: 0,
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              ".MuiCheckbox-root": { p: 0, mr: 0 },
              ".MuiFormControlLabel-label": { fontSize: 13, lineHeight: 1.25 },
            }}
            control={<Checkbox checked={values.includes(opt)} onChange={() => onToggle(opt)} />}
            label={opt === "OUTRO" ? "Outro" : opt}
          />
        ))}
      </Box>

      {otherSelected ? (
        <TextField
          label={otherLabel ?? "Descreva"}
          fullWidth
          size="small"
          value={otherText ?? ""}
          onChange={(e) => onChangeOther(e.target.value)}
        />
      ) : null}
    </Box>
  );
}

export function StepSystems({
  defaultValues,
  onAutoSave,
}: {
  defaultValues: any;
  onAutoSave: (data: SystemsPageValues) => void;
}) {
  const initial = SystemsPageSchema.parse(defaultValues ?? {});
  const [data, setData] = React.useState<SystemsPageValues>(initial);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const ok = SystemsPageSchema.safeParse(data);
      if (ok.success) onAutoSave(ok.data);
    }, 700);
    return () => clearTimeout(t);
  }, [JSON.stringify(data)]);

  const categoryByKey = React.useMemo(
    () => Object.fromEntries(CATEGORIES.map((item) => [item.key, item])) as Record<CategoryKey, (typeof CATEGORIES)[number]>,
    []
  );

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Sistemas e soluções utilizadas
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Mantivemos todas as categorias da etapa e reorganizamos a página para destacar os grupos principais, sem perder os demais blocos.
        </Typography>

        <Box sx={{ display: "grid", gap: 2 }}>
          {ROWS.map((row, rowIndex) => (
            <Box
              key={row.join("-")}
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                alignItems: "stretch",
              }}
            >
              {row.map((key) => {
                const c = categoryByKey[key];
                return (
                  <CategoryCard
                    key={c.key}
                    title={c.title}
                    options={c.options}
                    values={data.systems[c.key].values}
                    otherText={data.systems[c.key].otherText}
                    otherLabel={c.otherLabel}
                    onToggle={(value) =>
                      setData((prev) => {
                        const nextValues = toggleInList(prev.systems[c.key].values, value);
                        return {
                          ...prev,
                          systems: {
                            ...prev.systems,
                            [c.key]: {
                              ...prev.systems[c.key],
                              values: nextValues,
                              otherText: nextValues.includes("OUTRO") ? prev.systems[c.key].otherText : "",
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
                          [c.key]: { ...prev.systems[c.key], otherText: value },
                        },
                      }))
                    }
                  />
                );
              })}
              {row.length === 1 ? <Box /> : null}
              {rowIndex < ROWS.length - 1 ? null : null}
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Comentários
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Use este campo apenas se houver alguma observação importante ou alguma ferramenta não listada.
        </Typography>

        <TextField
          fullWidth
          multiline
          minRows={2}
          value={data.systemsComment ?? ""}
          onChange={(e) => setData((prev) => ({ ...prev, systemsComment: e.target.value }))}
          placeholder="Ex.: integração própria, sistema legado, observação pontual..."
        />
      </CardContent>
    </Card>
  );
}
