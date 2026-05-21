export const HONORARIUM_PROPOSAL_MODELS = [
  {
    id: "honorarium-proposta-corporativa-azul",
    name: "Modelo Corporativo Azul",
    description: "Modelo institucional de proposta comercial Honorarium.",
    filename: "Proposta Comercial Corporativa - Azul (1).pdf",
    publicPath: "/templates/propostas/proposta-corporativa-azul.pdf",
  },
  {
    id: "honorarium-proposta-corporativa-azul-escuro",
    name: "Modelo Corporativo Azul Escuro",
    description: "Variação institucional de proposta comercial Honorarium.",
    filename: "Proposta Corporativa (Variação 2) Azul Escuro (1).pdf",
    publicPath: "/templates/propostas/proposta-corporativa-azul-escuro.pdf",
  },
] as const;

export const HONORARIUM_CONTRACT_TEMPLATE = {
  id: "honorarium-contrato-padrao",
  name: "Contrato padrão Honorarium",
  description: "Modelo editável de contrato de prestação de serviços contábeis consultivos.",
  filename: "contrato-honorarium-padrao.pdf",
  publicPath: "/templates/contratos/contrato-honorarium-padrao.pdf",
} as const;

export function getHonorariumProposalModelById(id?: string | null) {
  if (!id) return null;
  return HONORARIUM_PROPOSAL_MODELS.find((item) => item.id === id) ?? null;
}
