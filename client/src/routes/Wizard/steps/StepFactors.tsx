import React from "react";
import { Box, Card, CardContent, Checkbox, Divider, FormControlLabel, TextField, Typography } from "@mui/material";
import { FactorsPageSchema, type FactorsPageValues } from "../wizardTypes";

const FACTORS = [
  "Tributação",
  "Atividade",
  "Quantidade de colaboradores",
  "Quantidade de lançamentos contábeis",
  "Quantidade de lançamentos fiscais",
  "Faturamento mensal/anual",
  "Sistemas integrados (cliente e contabilidade)",
  "Apuração externa (ERP do cliente)",
  "Quantidade de instituições",
  "OUTRO",
];

const HIGHLIGHTS = [
  "Facilidade para Gerar Propostas",
  "Portal de Contratos Integrado",
  "Padronização e Automação da Precificação",
  "Pacotes de Benefícios Personalizados",
  "Profissionalização do Processo Comercial",
  "Melhor Posicionamento no Mercado",
  "Acompanhar a Jornada dos Clientes",
];

function toggleInList(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function StepFactors({
  defaultValues,
  onAutoSave,
}: {
  defaultValues: any;
  onAutoSave: (data: FactorsPageValues) => void;
}) {
  const initial = FactorsPageSchema.parse(defaultValues ?? {});
  const [data, setData] = React.useState<FactorsPageValues>(initial);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const ok = FactorsPageSchema.safeParse(data);
      if (ok.success) onAutoSave(ok.data);
    }, 700);
    return () => clearTimeout(t);
  }, [JSON.stringify(data)]);

  const factorsSelected = (data.pricingFactors ?? []).includes("OUTRO");

  return (
    <Card variant="outlined" sx={{ borderColor: "rgba(16,24,40,0.18)", borderWidth: 1.5 }}>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Fatores e expectativa
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Queremos entender como sua precificação funciona hoje e o que mais te encantou no Honorarium.
        </Typography>

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Quais aspectos são considerados ao precificar seus honorários?
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Marque os fatores que mais impactam sua precificação.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.5 }}>
          {FACTORS.map((f) => (
            <FormControlLabel
              key={f}
              control={
                <Checkbox
                  checked={data.pricingFactors.includes(f)}
                  onChange={() =>
                    setData((prev) => {
                      const next = toggleInList(prev.pricingFactors, f);
                      const nextOtherText = next.includes("OUTRO") ? prev.pricingFactorsComment : prev.pricingFactorsComment;
                      return { ...prev, pricingFactors: next, pricingFactorsComment: nextOtherText };
                    })
                  }
                />
              }
              label={f === "OUTRO" ? "Outro" : f}
              sx={{ m: 0 }}
            />
          ))}
        </Box>

        {factorsSelected ? (
          <Box sx={{ mt: 1.75 }}>
            <TextField
              label="Outro fator importante"
              fullWidth
              value={(data as any).pricingFactorsOtherText ?? ""}
              onChange={(e) => setData((prev) => ({ ...(prev as any), pricingFactorsOtherText: e.target.value }))}
            />
          </Box>
        ) : null}

        <Box sx={{ mt: 2.25 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, mb: 1 }}>
            Comentários
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={data.pricingFactorsComment ?? ""}
            onChange={(e) => setData((prev) => ({ ...prev, pricingFactorsComment: e.target.value }))}
            placeholder="Observações pontuais sobre sua lógica de precificação"
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          O que te encantou no Honorarium?
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Selecione os pontos que mais fizeram sentido para você.
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.5 }}>
          {HIGHLIGHTS.map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Checkbox
                  checked={(data.honorariumHighlights ?? []).includes(item)}
                  onChange={() =>
                    setData((prev) => ({
                      ...prev,
                      honorariumHighlights: toggleInList(prev.honorariumHighlights ?? [], item),
                    }))
                  }
                />
              }
              label={item}
              sx={{ m: 0 }}
            />
          ))}
        </Box>

        <Box sx={{ mt: 2.25 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, mb: 1 }}>
            Qual sua expectativa?
          </Typography>
          <TextField
            placeholder="Conte brevemente o que você espera da implantação e da utilização do Honorarium"
            multiline
            minRows={3}
            fullWidth
            value={data.expectation ?? ""}
            onChange={(e) => setData((prev) => ({ ...prev, expectation: e.target.value }))}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
