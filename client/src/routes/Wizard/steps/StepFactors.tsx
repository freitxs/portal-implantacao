import React from "react";
import { Box, Card, CardContent, Checkbox, Divider, FormControl, FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { EXPECTATION_OPTIONS, FactorsPageDraftSchema, type FactorsPageDraftValues } from "../wizardTypes";

const FACTORS = [
  "Tributação",
  "Atividade",
  "Colaboradores",
  "Lançamentos fiscais",
  "Lançamentos contábeis",
  "Faturamento",
  "Sistemas integrados",
  "Apuração externa",
  "Complexidade operacional",
  "Atendimento consultivo",
  "Outro",
];

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function StepFactors({
  defaultValues,
  onAutoSave,
  onDraftChange,
}: {
  defaultValues: any;
  onAutoSave: (data: FactorsPageDraftValues) => void;
  onDraftChange?: (data: FactorsPageDraftValues) => void;
}) {
  const normalizeDraft = React.useCallback((input: any) => {
    const parsedDefaultValues = FactorsPageDraftSchema.parse(input ?? {});
    return {
      ...parsedDefaultValues,
      pricingFactors: (parsedDefaultValues.pricingFactors ?? []).map((item) => (item === "OUTRO" ? "Outro" : item)),
    };
  }, []);
  const [data, setData] = React.useState<FactorsPageDraftValues>(() => normalizeDraft(defaultValues));
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
    const normalized = {
      ...data,
      honorariumHighlights: data.expectation ? [data.expectation] : [],
    };
    const serialized = JSON.stringify(normalized);
    onDraftChange?.(normalized);
    if (serialized !== lastSavedRef.current) {
      lastSavedRef.current = serialized;
      onAutoSave(normalized);
    }
  }, [data, onAutoSave, onDraftChange]);

  const hasOtherFactor = (data.pricingFactors ?? []).includes("Outro");

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Critérios de precificação e expectativa principal
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Selecione os critérios usados hoje e o principal resultado esperado com a implantação.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Critérios de precificação
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Escolha os pontos que hoje influenciam o honorário.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.35 }}>
          {FACTORS.map((factor) => (
            <FormControlLabel
              key={factor}
              control={
                <Checkbox
                  checked={(data.pricingFactors ?? []).includes(factor)}
                  onChange={() =>
                    setData((prev) => {
                      const nextFactors = toggleInList(prev.pricingFactors ?? [], factor);
                      return {
                        ...prev,
                        pricingFactors: nextFactors,
                        pricingFactorsOtherText: nextFactors.includes("Outro") ? prev.pricingFactorsOtherText : "",
                      };
                    })
                  }
                />
              }
              label={factor}
              slotProps={{
                typography: {
                  sx: {
                    fontSize: 13.25,
                    lineHeight: 1.4,
                    overflowWrap: "anywhere",
                  },
                },
              }}
              sx={{ m: 0, pr: 0.5 }}
            />
          ))}
        </Box>

        {hasOtherFactor ? (
          <TextField
            fullWidth
            label="Informe o outro critério"
            sx={{ mt: 1.75 }}
            value={data.pricingFactorsOtherText ?? ""}
            onChange={(event) => setData((prev) => ({ ...prev, pricingFactorsOtherText: event.target.value }))}
          />
        ) : null}

        <Box sx={{ mt: 2.25 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, mb: 1 }}>
            Observações complementares
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Use este campo apenas se houver uma particularidade relevante."
            value={data.pricingFactorsComment ?? ""}
            onChange={(event) => setData((prev) => ({ ...prev, pricingFactorsComment: event.target.value }))}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Expectativa principal
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Escolha o resultado principal esperado nesta implantação.
        </Typography>

        <FormControl sx={{ width: "100%" }}>
          <RadioGroup
            value={data.expectation ?? ""}
            onChange={(event) =>
              setData((prev) => ({
                ...prev,
                expectation: event.target.value as FactorsPageDraftValues["expectation"],
                honorariumHighlights: [event.target.value],
              }))
            }
            sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.35 }}
          >
            {EXPECTATION_OPTIONS.map((option) => (
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
                sx={{ m: 0, pr: 0.5 }}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </CardContent>
    </Card>
  );
}
