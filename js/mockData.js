/**
 * Mock Data para simulação de transações e métricas
 * Valores iniciais calibrados com os totais exibidos na interface de referência
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
  "Auto Posto Alvorada Ltda",
  "Supermercado Real Super",
  "Drogaria Central Popular",
  "Padaria & Confeitaria Estrela",
  "Restaurante Sabor & Arte",
  "Boutique Bella Moda",
  "Francisco Comércio Varejista",
  "Ótica Nova Visão",
  "Tech Prime Eletrônicos",
  "Mecânica Express Auto"
];

export const MOCK_PARTNERS = [
  "Todos os parceiros",
  "Alpha Soluções e Pagamentos",
  "Beta Intermediações Comerciais",
  "Delta Pay Serviços",
  "Nexus Tech Finance",
  "Francisco Representações"
];

export const MOCK_TERMINALS = [
  "Selecionar",
  "POS-00129 (Balcão 1)",
  "POS-00130 (Balcão 2)",
  "Smart-8842 (Móvel Delivery)",
  "Smart-9021 (Caixa Principal)",
  "Smart-9022 (Área Externa)",
  "Pinpad-4011 (Terminal Integrado)"
];

export const MOCK_PAYMENT_METHODS = [
  "Todas",
  "Crédito à Vista",
  "Crédito Parcelado",
  "Débito",
  "PIX QR Code",
  "Voucher Refeição/Alimentação"
];

export const MOCK_INSTALLMENTS = [
  "Todas",
  "1x (À Vista)",
  "2x a 6x",
  "7x a 12x",
  "13x a 18x"
];

export const MOCK_BRANDS = [
  "Todas",
  "Mastercard",
  "Visa",
  "Elo",
  "Hipercard",
  "American Express",
  "Alelo",
  "Sodexo"
];

export const MOCK_STATUSES = [
  "Todos",
  "Aprovada",
  "Pendente",
  "Cancelada",
  "Estornada"
];

export const MOCK_PROVIDER_ACCOUNTS = [
  "Todas as contas",
  "001 - Banco do Brasil (Ag: 1420 / CC: 9812-4)",
  "033 - Santander Brasil (Ag: 0552 / CC: 44102-9)",
  "341 - Itaú Unibanco (Ag: 3201 / CC: 77210-5)",
  "422 - Banco Safra Adquirência",
  "260 - Nu Pagamentos S.A."
];

export const MOCK_SPREADS = [
  "Todos os spreads",
  "Padrão (0.85%)",
  "Especial Fidelidade (0.60%)",
  "Promocional 2026 (0.45%)",
  "Personalizado Varejo (1.10%)"
];

export const MOCK_TRANSACTIONS = [
  {
    id: "TX-984210",
    date: "2026-08-27 10:45:21",
    company: "Auto Posto Alvorada Ltda",
    partner: "Alpha Soluções e Pagamentos",
    terminal: "Smart-8842 (Móvel Delivery)",
    method: "Crédito à Vista",
    installments: "1x",
    brand: "Mastercard",
    grossAmount: 320.50,
    fee: 6.41,
    netAmount: 314.09,
    partnerCommission: 4.80,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "001 - Banco do Brasil"
  },
  {
    id: "TX-984209",
    date: "2026-08-27 10:22:15",
    company: "Supermercado Real Super",
    partner: "Beta Intermediações Comerciais",
    terminal: "POS-00129 (Balcão 1)",
    method: "Débito",
    installments: "1x",
    brand: "Visa",
    grossAmount: 184.90,
    fee: 2.22,
    netAmount: 182.68,
    partnerCommission: 2.77,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-984208",
    date: "2026-08-27 09:54:02",
    company: "Restaurante Sabor & Arte",
    partner: "Alpha Soluções e Pagamentos",
    terminal: "Smart-9021 (Caixa Principal)",
    method: "PIX QR Code",
    installments: "1x",
    brand: "Elo",
    grossAmount: 89.00,
    fee: 0.89,
    netAmount: 88.11,
    partnerCommission: 1.33,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "001 - Banco do Brasil"
  },
  {
    id: "TX-984207",
    date: "2026-08-27 09:12:44",
    company: "Boutique Bella Moda",
    partner: "Nexus Tech Finance",
    terminal: "POS-00130 (Balcão 2)",
    method: "Crédito Parcelado",
    installments: "3x",
    brand: "Mastercard",
    grossAmount: 650.00,
    fee: 22.75,
    netAmount: 627.25,
    partnerCommission: 9.75,
    clientPaid: 35.00,
    clientCommission: 0.05,
    status: "Aprovada",
    providerAccount: "033 - Santander Brasil"
  },
  {
    id: "TX-984206",
    date: "2026-08-26 18:30:19",
    company: "Padaria & Confeitaria Estrela",
    partner: "Beta Intermediações Comerciais",
    terminal: "Smart-9022 (Área Externa)",
    method: "Débito",
    installments: "1x",
    brand: "Mastercard",
    grossAmount: 45.20,
    fee: 0.54,
    netAmount: 44.66,
    partnerCommission: 0.68,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "341 - Itaú Unibanco"
  },
  {
    id: "TX-984205",
    date: "2026-08-26 17:15:33",
    company: "Drogaria Central Popular",
    partner: "Delta Pay Serviços",
    terminal: "Pinpad-4011 (Terminal Integrado)",
    method: "Crédito à Vista",
    installments: "1x",
    brand: "Visa",
    grossAmount: 210.80,
    fee: 4.22,
    netAmount: 206.58,
    partnerCommission: 3.16,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "422 - Banco Safra Adquirência"
  },
  {
    id: "TX-984204",
    date: "2026-08-26 16:08:12",
    company: "Tech Prime Eletrônicos",
    partner: "Alpha Soluções e Pagamentos",
    terminal: "POS-00129 (Balcão 1)",
    method: "Crédito Parcelado",
    installments: "10x",
    brand: "Elo",
    grossAmount: 1890.00,
    fee: 94.50,
    netAmount: 1795.50,
    partnerCommission: 28.35,
    clientPaid: 120.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "001 - Banco do Brasil"
  },
  {
    id: "TX-984203",
    date: "2026-08-26 14:40:50",
    company: "Francisco Comércio Varejista",
    partner: "Francisco Representações",
    terminal: "Smart-8842 (Móvel Delivery)",
    method: "Crédito Parcelado",
    installments: "6x",
    brand: "Hipercard",
    grossAmount: 430.00,
    fee: 17.20,
    netAmount: 412.80,
    partnerCommission: 6.45,
    clientPaid: 45.00,
    clientCommission: 0.00,
    status: "Pendente",
    providerAccount: "033 - Santander Brasil"
  },
  {
    id: "TX-984202",
    date: "2026-08-25 19:22:11",
    company: "Ótica Nova Visão",
    partner: "Nexus Tech Finance",
    terminal: "POS-00130 (Balcão 2)",
    method: "Crédito Parcelado",
    installments: "4x",
    brand: "Mastercard",
    grossAmount: 780.00,
    fee: 27.30,
    netAmount: 752.70,
    partnerCommission: 11.70,
    clientPaid: 65.00,
    clientCommission: 0.00,
    status: "Aprovada",
    providerAccount: "260 - Nu Pagamentos S.A."
  },
  {
    id: "TX-984201",
    date: "2026-08-25 11:10:05",
    company: "Mecânica Express Auto",
    partner: "Delta Pay Serviços",
    terminal: "Smart-9021 (Caixa Principal)",
    method: "Crédito à Vista",
    installments: "1x",
    brand: "Visa",
    grossAmount: 520.00,
    fee: 10.40,
    netAmount: 509.60,
    partnerCommission: 7.80,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Cancelada",
    providerAccount: "422 - Banco Safra Adquirência"
  },
  {
    id: "TX-984200",
    date: "2026-08-24 15:45:00",
    company: "Supermercado Real Super",
    partner: "Beta Intermediações Comerciais",
    terminal: "POS-00129 (Balcão 1)",
    method: "Voucher Refeição/Alimentação",
    installments: "1x",
    brand: "Alelo",
    grossAmount: 142.30,
    fee: 4.98,
    netAmount: 137.32,
    partnerCommission: 2.13,
    clientPaid: 0.00,
    clientCommission: 0.00,
    status: "Estornada",
    providerAccount: "341 - Itaú Unibanco"
  }
];
