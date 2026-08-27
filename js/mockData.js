/**
 * Mock Data para simulação de transações e métricas
 * Calibrado 100% idêntico à tabela da imagem de referência
 */

export const INITIAL_KPIS = {
  totalFaturamento: 125579.07,
  totalEmpresa: 118178.67,
  totalLiquido: 2177.38,
  totalParceiro: 1692.06,
  totalPagoClientes: 425.13,
  totalComissaoCliente: 0.05
};

export const MOCK_COMPANIES = [
  "Selecionar",
  "MIRANTE BRISA MAR GASTRONOMIA",
  "K. SA CAFES ESPECIAIS LTDA",
  "Auto Posto Alvorada Ltda",
  "Supermercado Real Super",
  "Drogaria Central Popular"
];

export const MOCK_PARTNERS = [
  "Todos os parceiros",
  "Alpha Soluções e Pagamentos",
  "Beta Intermediações Comerciais",
  "Delta Pay Serviços",
  "Nexus Tech Finance"
];

export const MOCK_TERMINALS = [
  "Selecionar",
  "1733773143",
  "J9B304967194",
  "POS-00129",
  "Smart-8842"
];

export const MOCK_PAYMENT_METHODS = [
  "Todas",
  "Débito",
  "Crédito",
  "PIX",
  "Voucher"
];

export const MOCK_INSTALLMENTS = [
  "Todas",
  "1x",
  "2x a 6x",
  "7x a 12x"
];

export const MOCK_BRANDS = [
  "Todas",
  "Visa",
  "Mastercard",
  "Elo",
  "Hipercard"
];

export const MOCK_STATUSES = [
  "Todos",
  "Aprovada",
  "Rejeitada",
  "Pendente",
  "Estornada"
];

export const MOCK_PROVIDER_ACCOUNTS = [
  "Todas as contas",
  "001 - Banco do Brasil",
  "033 - Santander Brasil",
  "341 - Itaú Unibanco"
];

export const MOCK_SPREADS = [
  "Todos os spreads",
  "Padrão (0.85%)",
  "Especial Fidelidade (0.60%)",
  "Promocional 2026 (0.45%)"
];

export const MOCK_TRANSACTIONS = [
  {
    id: "TX-1001",
    terminal: "1733773143",
    date: "27/08/2026",
    time: "12:38",
    company: "MIRANTE BRISA MAR GASTRONOMIA",
    partner: "Alpha Soluções e Pagamentos",
    method: "Débito",
    installments: "1x",
    brand: "Visa",
    status: "Aprovada",
    feePercent: "2.89%",
    grossAmount: 91.00,
    netAmount: 88.37,
    spread: 0.81,
    clientPaid: null,
    providerAccount: "001 - Banco do Brasil"
  },
  {
    id: "TX-1002",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:36",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Crédito",
    installments: "1x",
    brand: "Mastercard",
    status: "Aprovada",
    feePercent: "5.48%",
    grossAmount: 54.00,
    netAmount: 51.04,
    spread: 0.53,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1003",
    terminal: "1733773143",
    date: "27/08/2026",
    time: "12:34",
    company: "MIRANTE BRISA MAR GASTRONOMIA",
    partner: "Alpha Soluções e Pagamentos",
    method: "Crédito",
    installments: "1x",
    brand: "Visa",
    status: "Aprovada",
    feePercent: "4.98%",
    grossAmount: 37.00,
    netAmount: 35.15,
    spread: 0.36,
    clientPaid: null,
    providerAccount: "001 - Banco do Brasil"
  },
  {
    id: "TX-1004",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:32",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Crédito",
    installments: "1x",
    brand: "Visa",
    status: "Rejeitada",
    feePercent: "5.48%",
    grossAmount: 8.00,
    netAmount: 7.56,
    spread: 0.31,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1005",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:32",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Crédito",
    installments: "1x",
    brand: "Visa",
    status: "Rejeitada",
    feePercent: "5.48%",
    grossAmount: 8.00,
    netAmount: 7.56,
    spread: 0.31,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1006",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:32",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Débito",
    installments: "1x",
    brand: "Mastercard",
    status: "Aprovada",
    feePercent: "3.49%",
    grossAmount: 8.00,
    netAmount: 7.72,
    spread: 0.07,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1007",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:26",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Débito",
    installments: "1x",
    brand: "Visa",
    status: "Aprovada",
    feePercent: "3.49%",
    grossAmount: 34.00,
    netAmount: 32.81,
    spread: 0.33,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1008",
    terminal: "J9B304967194",
    date: "27/08/2026",
    time: "12:21",
    company: "K. SA CAFES ESPECIAIS LTDA",
    partner: "Beta Intermediações Comerciais",
    method: "Crédito",
    installments: "1x",
    brand: "Mastercard",
    status: "Aprovada",
    feePercent: "5.48%",
    grossAmount: 12.00,
    netAmount: 11.34,
    spread: 0.11,
    clientPaid: null,
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-1009",
    terminal: "1733773143",
    date: "27/08/2026",
    time: "12:15",
    company: "MIRANTE BRISA MAR GASTRONOMIA",
    partner: "Alpha Soluções e Pagamentos",
    method: "Crédito",
    installments: "1x",
    brand: "Mastercard",
    status: "Aprovada",
    feePercent: "4.98%",
    grossAmount: 80.00,
    netAmount: 76.01,
    spread: 0.79,
    clientPaid: null,
    providerAccount: "001 - Banco do Brasil"
  }
];
