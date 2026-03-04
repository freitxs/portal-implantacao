import React from "react";
import { Box, Card, CardContent, Checkbox, Divider, FormControlLabel, TextField, Typography } from "@mui/material";
import { FactorsPageSchema, type FactorsPageValues } from "../wizardTypes";

const SERVICES = [
  "Consultoria Tributária",
  "Planejamento Financeiro",
  "BPO Financeiro",
  "Holding",
  "BI e Dashboards",
  "Recrutamento e Seleção de Colaboradores",
  "Regularização de Alvarás e Certidões",
  "Planejamento sucessório",
  "Planejamento de Expansão",
  "Revisão de grade tributária de ERP do cliente",
  "Precificação e markup",
  "DRE Gerencial",
  "Recuperação de crédito",
  "Recalculo de guia",
  "Simulação de rescisão de contrato de trabalho",
  "OUTRO",
];

const FACTORS = [
  "Tributação",
  "Atividade",
  "Quantidade de colaboradores",
  "Quantidade de lançamentos Contábeis",
  "Quantidade de lançamentos Fiscais",
  "Faturamento Mensal/Anual",
  "Sistemas Integrados (Cliente e Contabilidade)",
  "Apuração externa (ERP do cliente)",
  "Quantidade de instituições",
  "OUTRO",
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

  const servicesSelected = (data.servicesOffered ?? []).includes("OUTRO");
  const factorsSelected = (data.pricingFactors ?? []).includes("OUTRO");

  return (
    <Card>
      <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>
          Serviços Adicionais Ofertados
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Quais serviços são ofertados além dos tradicionais?
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 0.5 }}>
          {SERVICES.map((s) => (
            <FormControlLabel
              key={s}
              control={
                <Checkbox
                  checked={(data.servicesOffered ?? []).includes(s)}
                  onChange={() =>
                    setData((prev) => {
                      const next = toggleInList(prev.servicesOffered ?? [], s);
                      const nextServicesOtherText = next.includes("OUTRO") ? (prev as any).servicesOtherText ?? "" : "";
                      return { ...(prev as any), servicesOffered: next, servicesOtherText: nextServicesOtherText };
                    })
                  }
                />
              }
              label={s === "OUTRO" ? "Outro" : s}
            />
          ))}
        </Box>

        {servicesSelected ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Outro (qual?)"
              fullWidth
              value={(data as any).servicesOtherText ?? ""}
              onChange={(e) => setData((prev) => ({ ...(prev as any), servicesOtherText: e.target.value }))}
            />
          </Box>
        ) : null}

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
            Comentários
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            Observações sobre os serviços adicionais ofertados.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={data.servicesComment ?? ""}
            onChange={(e) => setData((prev) => ({ ...prev, servicesComment: e.target.value }))}
            placeholder="Ex.: serviços em implantação, recorrência, particularidades..."
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          Quais os aspectos são considerados ao precificar seus honorários?
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
                      const nextPricingFactorsOtherText = next.includes("OUTRO") ? (prev as any).pricingFactorsOtherText ?? "" : "";
                      return { ...(prev as any), pricingFactors: next, pricingFactorsOtherText: nextPricingFactorsOtherText };
                    })
                  }
                />
              }
              label={f === "OUTRO" ? "Outro" : f}
            />
          ))}
        </Box>

        {factorsSelected ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              label="Outro (qual?)"
              fullWidth
              value={(data as any).pricingFactorsOtherText ?? ""}
              onChange={(e) => setData((prev) => ({ ...(prev as any), pricingFactorsOtherText: e.target.value }))}
            />
          </Box>
        ) : null}

        <Box sx={{ mt: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
            Comentários
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            Observações sobre os aspectos considerados na precificação.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={data.pricingFactorsComment ?? ""}
            onChange={(e) => setData((prev) => ({ ...prev, pricingFactorsComment: e.target.value }))}
            placeholder="Ex.: como você mede volume, exceções, particularidades..."
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
          O que te encantou no Honorarium?
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Queremos entender sua motivação e expectativa para um atendimento personalizado.
        </Typography>

        <TextField
          label="Resposta (texto livre)"
          placeholder="Escreva com o máximo de detalhes que puder…"
          multiline
          minRows={5}
          fullWidth
          value={data.motivation ?? ""}
          onChange={(e) => setData((prev) => ({ ...prev, motivation: e.target.value }))}
          sx={{ mt: 1.5 }}
        />
      </CardContent>
    </Card>
  );
}