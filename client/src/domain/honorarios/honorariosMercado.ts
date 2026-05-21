export type HonorarioMercadoStatus = "Coerente" | "Abaixo do mercado" | "Acima do mercado";

export type HonorarioMercadoScenarioInput = {
  id?: string;
  nome?: string;
  faturamentoMensal: number;
  colaboradores: number;
  lancamentosFiscais: number;
  honorarioInformado: number;
};

export type HonorarioMercadoConfig = {
  valorPorColaborador: number;
  valorMinimoPorColaborador: number;
  valorMaximoPorColaborador: number;
  valorPorLancamentoFiscal: number;
  tamanhoBlocoFaturamento: number;
  valorPorBlocoFaturamento: number;
  percentualTolerancia: number;
  arredondamento: number;
};

export type HonorarioMercadoScenarioResult = HonorarioMercadoScenarioInput & {
  blocosFaturamento: number;
  valorImplicitoPorBloco: number | null;
  honorarioBase: number;
  honorarioSugerido: number;
  diferenca: number;
  limiteTolerancia: number;
  status: HonorarioMercadoStatus;
};

export type HonorarioMercadoSimulationResult = {
  cenarios: HonorarioMercadoScenarioResult[];
  cenarioMaisAbaixo: HonorarioMercadoScenarioResult | null;
  honorarioSugeridoParaFecharConta: number | null;
  ajusteSugerido: number | null;
  chequeEscalaFaturamento: string | null;
  observacaoPrincipal: string;
};

function roundToCurrency(value: number) {
  return Number(value.toFixed(2));
}

export function getDefaultHonorarioMercadoConfig(): HonorarioMercadoConfig {
  return {
    valorPorColaborador: 50,
    valorMinimoPorColaborador: 30,
    valorMaximoPorColaborador: 70,
    valorPorLancamentoFiscal: 0.2,
    tamanhoBlocoFaturamento: 10_000,
    valorPorBlocoFaturamento: 39.86,
    percentualTolerancia: 0.15,
    arredondamento: 50,
  };
}

export function calcularCenarioHonorarioMercado(
  input: HonorarioMercadoScenarioInput,
  config: HonorarioMercadoConfig = getDefaultHonorarioMercadoConfig()
): HonorarioMercadoScenarioResult {
  const blocosFaturamento = input.faturamentoMensal / config.tamanhoBlocoFaturamento;
  const valorImplicitoPorBloco =
    input.faturamentoMensal > 0 && blocosFaturamento !== 0
      ? roundToCurrency(
          (input.honorarioInformado -
            input.colaboradores * config.valorPorColaborador -
            input.lancamentosFiscais * config.valorPorLancamentoFiscal) /
            blocosFaturamento
        )
      : null;

  const honorarioBase =
    input.colaboradores * config.valorPorColaborador +
    input.lancamentosFiscais * config.valorPorLancamentoFiscal +
    blocosFaturamento * config.valorPorBlocoFaturamento;
  const honorarioSugerido = Math.round(honorarioBase / config.arredondamento) * config.arredondamento;
  const diferenca = roundToCurrency(honorarioSugerido - input.honorarioInformado);
  const limiteTolerancia = roundToCurrency(Math.max(config.arredondamento / 2, input.honorarioInformado * config.percentualTolerancia));

  let status: HonorarioMercadoStatus = "Coerente";
  if (diferenca > limiteTolerancia) status = "Abaixo do mercado";
  if (diferenca < -limiteTolerancia) status = "Acima do mercado";

  return {
    ...input,
    blocosFaturamento: roundToCurrency(blocosFaturamento),
    valorImplicitoPorBloco,
    honorarioBase: roundToCurrency(honorarioBase),
    honorarioSugerido,
    diferenca,
    limiteTolerancia,
    status,
  };
}

export function calcularSimulacaoHonorarioMercado(
  cenarios: HonorarioMercadoScenarioInput[],
  config: HonorarioMercadoConfig = getDefaultHonorarioMercadoConfig()
): HonorarioMercadoSimulationResult {
  const cenariosCalculados = cenarios.map((cenario) => calcularCenarioHonorarioMercado(cenario, config));
  const cenarioMaisAbaixo =
    cenariosCalculados
      .filter((cenario) => cenario.diferenca > 0)
      .sort((left, right) => right.diferenca - left.diferenca)[0] ?? null;

  const cenariosComBloco = [...cenariosCalculados]
    .filter((cenario) => cenario.valorImplicitoPorBloco !== null)
    .sort((left, right) => left.faturamentoMensal - right.faturamentoMensal);

  let chequeEscalaFaturamento: string | null = null;
  if (cenariosComBloco.length >= 2) {
    const primeiro = cenariosComBloco[0];
    const ultimo = cenariosComBloco[cenariosComBloco.length - 1];

    chequeEscalaFaturamento =
      (ultimo.valorImplicitoPorBloco ?? 0) > (primeiro.valorImplicitoPorBloco ?? 0)
        ? "O cenário de maior faturamento exige valor por R$ 10 mil acima do cenário de menor faturamento. A escala do faturamento não reduziu como esperado."
        : "A escala do faturamento ficou compatível com a redução gradual.";
  }

  return {
    cenarios: cenariosCalculados,
    cenarioMaisAbaixo,
    honorarioSugeridoParaFecharConta: cenarioMaisAbaixo?.honorarioSugerido ?? null,
    ajusteSugerido: cenarioMaisAbaixo?.diferenca ?? null,
    chequeEscalaFaturamento,
    observacaoPrincipal: cenarioMaisAbaixo
      ? "Consulte o honorário sugerido para ajustar o cenário com maior disparidade."
      : "Os honorários informados ficaram dentro da faixa coerente definida.",
  };
}
