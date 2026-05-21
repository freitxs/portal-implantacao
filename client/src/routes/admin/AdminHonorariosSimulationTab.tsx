import React from "react";
import TrendingDownRoundedIcon from "@mui/icons-material/TrendingDownRounded";
import { Alert, Box, Card, CardContent, Chip, Divider, Stack, TextField, Typography } from "@mui/material";
import {
  calcularSimulacaoHonorarioMercado,
  getDefaultHonorarioMercadoConfig,
  type HonorarioMercadoScenarioInput,
  type HonorarioMercadoScenarioResult,
} from "../../domain/honorarios/honorariosMercado";

type ScenarioDraft = {
  id: string;
  nome: string;
  faturamentoMensal: string;
  colaboradores: string;
  lancamentosFiscais: string;
  honorarioInformado: string;
};

const DEFAULT_DRAFTS: ScenarioDraft[] = [
  {
    id: "cenario-1",
    nome: "Cenário 1",
    faturamentoMensal: "35000",
    colaboradores: "2",
    lancamentosFiscais: "180",
    honorarioInformado: "380",
  },
  {
    id: "cenario-2",
    nome: "Cenário 2",
    faturamentoMensal: "70000",
    colaboradores: "9",
    lancamentosFiscais: "420",
    honorarioInformado: "760",
  },
  {
    id: "cenario-3",
    nome: "Cenário 3",
    faturamentoMensal: "120000",
    colaboradores: "6",
    lancamentosFiscais: "1900",
    honorarioInformado: "800",
  },
];

const config = getDefaultHonorarioMercadoConfig();

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function getStatusColor(status: HonorarioMercadoScenarioResult["status"]) {
  if (status === "Coerente") return "success";
  if (status === "Abaixo do mercado") return "warning";
  return "error";
}

function toScenarioInput(draft: ScenarioDraft): HonorarioMercadoScenarioInput | null {
  const faturamentoMensal = Number(draft.faturamentoMensal);
  const colaboradores = Number(draft.colaboradores);
  const lancamentosFiscais = Number(draft.lancamentosFiscais);
  const honorarioInformado = Number(draft.honorarioInformado);

  if (!Number.isFinite(faturamentoMensal) || !Number.isFinite(colaboradores) || !Number.isFinite(lancamentosFiscais) || !Number.isFinite(honorarioInformado)) {
    return null;
  }

  return {
    id: draft.id,
    nome: draft.nome.trim() || undefined,
    faturamentoMensal,
    colaboradores,
    lancamentosFiscais,
    honorarioInformado,
  };
}

function ScenarioStatusChip({ status }: { status: HonorarioMercadoScenarioResult["status"] }) {
  return <Chip label={status} color={getStatusColor(status)} sx={{ fontWeight: 700 }} />;
}

export function AdminHonorariosSimulationTab() {
  const [drafts, setDrafts] = React.useState<ScenarioDraft[]>(DEFAULT_DRAFTS);

  const updateHonorario = (id: string, value: string) => {
    setDrafts((previous) => previous.map((draft) => (draft.id === id ? { ...draft, honorarioInformado: value } : draft)));
  };

  const cenarios = React.useMemo(
    () => drafts.map(toScenarioInput).filter((scenario): scenario is HonorarioMercadoScenarioInput => Boolean(scenario)),
    [drafts]
  );

  const result = React.useMemo(() => {
    if (!cenarios.length) return null;
    return calcularSimulacaoHonorarioMercado(cenarios, config);
  }, [cenarios]);

  if (!drafts.length) {
    return (
      <Card>
        <CardContent>
          <Typography color="text.secondary">Informe ao menos um cenário para calcular a simulação.</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
          <Stack spacing={1.2}>
            <Typography sx={{ fontWeight: 900, fontSize: 24 }}>Simulação de honorários</Typography>
            <Typography color="text.secondary">
              Digite apenas o honorário informado em cada cenário. As demais referências já seguem a estrutura da planilha de mercado.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Cenários de simulação</Typography>

          <Box sx={{ display: "grid", gap: 1.25 }}>
            {drafts.map((draft) => (
              <Box
                key={draft.id}
                sx={{
                  border: "1px solid rgba(15,23,42,0.08)",
                  borderRadius: 4,
                  p: 2,
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: { xs: "1fr", md: "1fr repeat(4, minmax(0, 1fr))" },
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 900 }}>{draft.nome}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.35 }}>
                    Cenário base da análise
                  </Typography>
                </Box>
                <TextField label="Faturamento mensal" value={formatCurrency(Number(draft.faturamentoMensal || 0))} InputProps={{ readOnly: true }} />
                <TextField label="Colaboradores" value={draft.colaboradores} InputProps={{ readOnly: true }} />
                <TextField label="Lançamentos fiscais" value={draft.lancamentosFiscais} InputProps={{ readOnly: true }} />
                <TextField
                  label="Honorário informado"
                  type="number"
                  value={draft.honorarioInformado}
                  onChange={(event) => updateHonorario(draft.id, event.target.value)}
                />
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Premissas do modelo</Typography>

          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", lg: "repeat(4, minmax(0, 1fr))" } }}>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography color="text.secondary">Valor por colaborador</Typography>
                <Typography sx={{ fontWeight: 900, mt: 0.5 }}>{formatCurrency(config.valorPorColaborador)}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography color="text.secondary">Faixa indicativa por colaborador</Typography>
                <Typography sx={{ fontWeight: 900, mt: 0.5 }}>
                  {formatCurrency(config.valorMinimoPorColaborador)} a {formatCurrency(config.valorMaximoPorColaborador)}
                </Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography color="text.secondary">Valor por lançamento fiscal</Typography>
                <Typography sx={{ fontWeight: 900, mt: 0.5 }}>{formatCurrency(config.valorPorLancamentoFiscal)}</Typography>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography color="text.secondary">Tolerância e arredondamento</Typography>
                <Typography sx={{ fontWeight: 900, mt: 0.5 }}>
                  {formatNumber(config.percentualTolerancia * 100)}% • {formatCurrency(config.arredondamento)}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>

      {!result ? <Alert severity="info">Informe ao menos um cenário para calcular a simulação.</Alert> : null}

      {result ? (
        <>
          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 900 }}>Diagnóstico por cenário</Typography>
              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: "grid", gap: 1.5 }}>
                {result.cenarios.map((cenario, index) => (
                  <Box key={cenario.id ?? index} sx={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 4, p: 2 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} justifyContent="space-between" alignItems={{ md: "center" }} sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontWeight: 900 }}>{cenario.nome || `Cenário ${index + 1}`}</Typography>
                      <ScenarioStatusChip status={cenario.status} />
                    </Stack>

                    <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))", xl: "repeat(5, minmax(0, 1fr))" } }}>
                      <Box>
                        <Typography color="text.secondary">Valor implícito por R$ 10 mil</Typography>
                        <Typography sx={{ fontWeight: 800 }}>
                          {cenario.valorImplicitoPorBloco === null ? "—" : formatCurrency(cenario.valorImplicitoPorBloco)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary">Honorário sugerido</Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatCurrency(cenario.honorarioSugerido)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary">Diferença</Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatCurrency(cenario.diferenca)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary">Limite de tolerância</Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatCurrency(cenario.limiteTolerancia)}</Typography>
                      </Box>
                      <Box>
                        <Typography color="text.secondary">Blocos de faturamento</Typography>
                        <Typography sx={{ fontWeight: 800 }}>{formatNumber(cenario.blocosFaturamento, 1)}</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography sx={{ fontWeight: 900 }}>Leitura automática</Typography>
              <Divider sx={{ my: 1.5 }} />

              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", lg: "repeat(4, minmax(0, 1fr))" } }}>
                {result.cenarioMaisAbaixo ? (
                  <Card variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Typography color="text.secondary">Cenário mais abaixo do mercado</Typography>
                      <Typography sx={{ fontWeight: 900, mt: 0.5 }}>{result.cenarioMaisAbaixo.nome ?? "Cenário selecionado"}</Typography>
                    </CardContent>
                  </Card>
                ) : null}

                {result.honorarioSugeridoParaFecharConta !== null ? (
                  <Card variant="outlined" sx={{ borderRadius: 4 }}>
                    <CardContent>
                      <Typography color="text.secondary">Honorário sugerido para fechar conta</Typography>
                      <Typography sx={{ fontWeight: 900, mt: 0.5 }}>{formatCurrency(result.honorarioSugeridoParaFecharConta)}</Typography>
                    </CardContent>
                  </Card>
                ) : null}

                {result.ajusteSugerido !== null ? (
                  <Card variant="outlined" sx={{ borderRadius: 4, borderColor: "rgba(245,158,11,0.38)" }}>
                    <CardContent>
                      <Typography color="text.secondary">Ajuste sugerido</Typography>
                      <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.5 }}>
                        <TrendingDownRoundedIcon color="warning" fontSize="small" />
                        <Typography sx={{ fontWeight: 900 }}>{formatCurrency(result.ajusteSugerido)}</Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                ) : null}

                <Card variant="outlined" sx={{ borderRadius: 4 }}>
                  <CardContent>
                    <Typography color="text.secondary">Observação principal</Typography>
                    <Typography sx={{ fontWeight: 700, mt: 0.5 }}>{result.observacaoPrincipal}</Typography>
                  </CardContent>
                </Card>
              </Box>

              {result.chequeEscalaFaturamento ? (
                <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                  {result.chequeEscalaFaturamento}
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </Stack>
  );
}
