import React from "react";
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { SystemsPageSchema, type SystemsPageValues } from "../wizardTypes";

type CategoryKey = keyof SystemsPageValues["systems"];

const CATEGORIES: Array<{
  key: CategoryKey;
  title: string;
  options: string[];
  hasOtherText?: boolean;
  otherLabel?: string;
}> = [
  {
    key: "erpContabil",
    title: "ERP Contábil",
    options: ["Dominio", "Questor", "SCI", "Alterdata", "IOB", "Fortes", "Contmatic", "Mastermac", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual ERP",
  },
  {
    key: "capturaArmazenamento",
    title: "Captura e armazenamento de documentos fiscais eletrônicos",
    options: ["SIEG", "Jettax", "Q-Drive", "Arquivei", "Espião", "Klaus", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "gestaoProcessos",
    title: "Gestão de processos e obrigações acessórias",
    options: ["Acessórias", "G-Click (hoje Omie.G-Click)", "Tareffa", "Ottimizza.Tareffa", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "bi",
    title: "BI",
    options: ["HubCount", "Nucont", "Power BI", "Dattos", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "cnd",
    title: "Controle de certidões negativas (CND) e regularidade",
    options: ["Questor CND", "Veri", "SIEG IriS", "Dootax CND", "suaCND.com", "IOB CND", "SCI Report CND", "Monitor Contábil", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "auditoriaConsultoriaAutomacao",
    title: "Auditoria, Consultoria e Automação",
    options: ["Sittax", "E-auditoria", "IOB", "Econect", "Dattos", "Kolossus", "AFD Questor", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "conciliacaoContabil",
    title: "Conciliação Contábil",
    options: ["Sittax", "Mister Contador", "SS Parisi", "Escritório Inteligente (Integra Fácil)", "Conciliador Contábil", "Ottimizza", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
  {
    key: "financeiroBpo",
    title: "Financeiro / BPO financeiro / ERP financeiro",
    options: ["Omie", "Conta Azul", "Questor Negócio", "Nibo", "OUTRO"],
    hasOtherText: true,
    otherLabel: "Descreva qual solução",
  },
];

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
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

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Marque as soluções utilizadas no seu escritório
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Vamos entender como você trabalha hoje. Marque as soluções que você utiliza — você pode selecionar mais de uma opção por categoria.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            alignItems: "start",
          }}
        >
          {CATEGORIES.map((c) => {
            const values = data.systems[c.key].values;
            const otherSelected = values.includes("OUTRO");
            return (
              <Box
                key={c.key}
                sx={{
                  border: "1px solid rgba(16,24,40,0.08)",
                  borderRadius: 3,
                  p: 2.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: 16, sm: 18 },
                    lineHeight: 1.2,
                    mb: 0.25,
                  }}
                >
                  {c.title}
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    columnGap: 2.5,
                    rowGap: 0.75,
                    alignContent: "start",
                  }}
                >
                  {c.options.map((opt) => (
                    <FormControlLabel
                      key={opt}
                      labelPlacement="end"
                      sx={{
                        m: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        ".MuiCheckbox-root": {
                          p: 0,
                          mr: 0,
                        },
                        ".MuiFormControlLabel-label": {
                          fontSize: 13,
                          lineHeight: 1.25,
                        },
                      }}
                      control={
                        <Checkbox
                          checked={values.includes(opt)}
                          onChange={() =>
                            setData((prev) => {
                              const nextValues = toggleInList(values, opt);
                              const nextOtherText = nextValues.includes("OUTRO") ? (prev.systems as any)[c.key].otherText : "";
                              return {
                                ...prev,
                                systems: {
                                  ...prev.systems,
                                  [c.key]: {
                                    ...(prev.systems as any)[c.key],
                                    values: nextValues,
                                    otherText: nextOtherText,
                                  },
                                },
                              };
                            })
                          }
                        />
                      }
                      label={opt === "OUTRO" ? "Outro" : opt}
                    />
                  ))}
                </Box>

                {c.hasOtherText && otherSelected && (
                  <TextField
                    label={c.otherLabel ?? "Descreva"}
                    fullWidth
                    size="small"
                    sx={{ mt: 0.25 }}
                    value={(data.systems as any)[c.key].otherText ?? ""}
                    onChange={(e) =>
                      setData((prev) => ({
                        ...prev,
                        systems: {
                          ...prev.systems,
                          [c.key]: { ...(prev.systems as any)[c.key], otherText: e.target.value },
                        },
                      }))
                    }
                  />
                )}
              </Box>
            );
          })}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Comentários
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Observações ou sistemas não relacionados acima.
        </Typography>

        <TextField
          fullWidth
          multiline
          minRows={4}
          value={data.systemsComment ?? ""}
          onChange={(e) => setData((prev) => ({ ...prev, systemsComment: e.target.value }))}
          placeholder="Ex.: usamos um sistema próprio para X, ou integrações específicas..."
        />
      </CardContent>
    </Card>
  );
}