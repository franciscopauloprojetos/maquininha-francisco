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
  "ESSENCE BEAUTY MIND",
  "WILLYAN",
  "ALINE RENATA DA ROSA",
  "EVANDRO CARNIEL",
  "VICTOR HUGO ALVES",
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

export const MOCK_COMPANIES_DATA = [
  {
    id: "EMP-001",
    name: "ESSENCE BEAUTY MIND",
    owner: "ESSENCE",
    email: "eliselima.06@gmail.com",
    phone: "(41) 98485-8140",
    createdAt: "11/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-002",
    name: "WILLYAN",
    owner: "WILLYAN",
    email: "willyansoaresbarbosa70@gmail.com",
    phone: "(58) 84968-981",
    createdAt: "11/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-003",
    name: "ALINE RENATA DA ROSA",
    owner: "ALINE",
    email: "alinerentadarosa155@gmail.com",
    phone: "(41) 98788-0938",
    createdAt: "11/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-004",
    name: "EVANDRO CARNIEL",
    owner: "EVANDRO",
    email: "evandrocarniel23@gmail.com",
    phone: "(43) 99928-1144",
    createdAt: "10/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-005",
    name: "VICTOR HUGO ALVES",
    owner: "Victor",
    email: "vhafumagalli@gmail.com",
    phone: "(41) 99746-2339",
    createdAt: "03/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-006",
    name: "MIRANTE BRISA MAR GASTRONOMIA",
    owner: "ROBERTO",
    email: "contato@mirantebrisa.com.br",
    phone: "(41) 99122-3344",
    createdAt: "01/08/2026",
    status: "Ativo"
  },
  {
    id: "EMP-007",
    name: "K. SA CAFES ESPECIAIS LTDA",
    owner: "KARINA",
    email: "financeiro@ksacafes.com.br",
    phone: "(41) 98877-6655",
    createdAt: "28/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-008",
    name: "DROGARIA CENTRAL POPULAR",
    owner: "MARCOS",
    email: "drogaria.central@gmail.com",
    phone: "(41) 3344-5566",
    createdAt: "25/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-009",
    name: "SUPERMERCADO REAL SUPER",
    owner: "FRANCISCO",
    email: "compras@realsuper.com.br",
    phone: "(41) 98711-2233",
    createdAt: "20/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-010",
    name: "PADARIA & CONFEITARIA ESTRELA",
    owner: "ESTELA",
    email: "padariaestrela@hotmail.com",
    phone: "(41) 3211-9988",
    createdAt: "18/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-011",
    name: "BOUTIQUE BELLA MODA",
    owner: "ISABELLA",
    email: "bella.moda@gmail.com",
    phone: "(41) 99655-4433",
    createdAt: "15/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-012",
    name: "TECH PRIME ELETRONICOS",
    owner: "LUCAS",
    email: "techprime@eletronicos.com",
    phone: "(41) 98400-1122",
    createdAt: "12/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-013",
    name: "OTICA NOVA VISAO LTDA",
    owner: "CLAUDIO",
    email: "otica.novavisao@gmail.com",
    phone: "(41) 3322-1100",
    createdAt: "10/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-014",
    name: "MECANICA EXPRESS AUTO",
    owner: "PAULO",
    email: "express.auto@gmail.com",
    phone: "(41) 98800-7788",
    createdAt: "05/07/2026",
    status: "Inativo"
  },
  {
    id: "EMP-015",
    name: "RESTAURANTE SABOR & ARTE",
    owner: "ARTHUR",
    email: "saborarte@restaurante.com",
    phone: "(41) 99111-2299",
    createdAt: "02/07/2026",
    status: "Ativo"
  },
  {
    id: "EMP-016",
    name: "AUTO POSTO ALVORADA LTDA",
    owner: "ANTONIO",
    email: "postoalvorada@gmail.com",
    phone: "(41) 3355-7799",
    createdAt: "01/07/2026",
    status: "Ativo"
  }
];

export const MOCK_NETWORK_USERS = [
  {
    id: "USR-ADMIN",
    name: "Francisco Pereira Paulo",
    email: "franciscopereirapaulo@gmail.com",
    password: "1Sucesso#",
    role: "Admin Master",
    parentId: null,
    commissionRate: 15.0,
    phone: "(41) 99999-8888",
    createdAt: "01/01/2026",
    status: "Ativo"
  },
  {
    id: "USR-001",
    name: "Alpha Soluções e Pagamentos",
    email: "alpha@solucoes.com.br",
    password: "123456",
    role: "Parceiro Master",
    parentId: "USR-ADMIN",
    commissionRate: 10.0,
    phone: "(41) 98888-1111",
    createdAt: "10/01/2026",
    status: "Ativo"
  },
  {
    id: "USR-002",
    name: "Beta Intermediações Comerciais",
    email: "beta@comercial.com.br",
    password: "123456",
    role: "Parceiro Master",
    parentId: "USR-ADMIN",
    commissionRate: 10.0,
    phone: "(41) 97777-2222",
    createdAt: "15/01/2026",
    status: "Ativo"
  },
  {
    id: "USR-003",
    name: "Delta Pay Serviços",
    email: "delta@deltapay.com.br",
    password: "123456",
    role: "Parceiro Master",
    parentId: "USR-ADMIN",
    commissionRate: 10.0,
    phone: "(41) 96666-3333",
    createdAt: "20/01/2026",
    status: "Ativo"
  },
  {
    id: "USR-004",
    name: "Carlos Silva",
    email: "carlos.silva@gmail.com",
    password: "123456",
    role: "Líder Regional",
    parentId: "USR-001",
    commissionRate: 7.5,
    phone: "(41) 98411-2233",
    createdAt: "01/02/2026",
    status: "Ativo"
  },
  {
    id: "USR-005",
    name: "Mariana Lima",
    email: "mariana.lima@gmail.com",
    password: "123456",
    role: "Consultora Senior",
    parentId: "USR-001",
    commissionRate: 7.5,
    phone: "(41) 99122-4455",
    createdAt: "05/02/2026",
    status: "Ativo"
  },
  {
    id: "USR-006",
    name: "Rodrigo Costa",
    email: "rodrigo.costa@gmail.com",
    password: "123456",
    role: "Líder Regional",
    parentId: "USR-002",
    commissionRate: 7.5,
    phone: "(41) 99877-6611",
    createdAt: "12/02/2026",
    status: "Ativo"
  },
  {
    id: "USR-007",
    name: "João Pedro",
    email: "joao.pedro@gmail.com",
    password: "123456",
    role: "Consultor de Vendas",
    parentId: "USR-004",
    commissionRate: 5.0,
    phone: "(41) 98700-1122",
    createdAt: "01/03/2026",
    status: "Ativo"
  },
  {
    id: "USR-008",
    name: "Bruna Souza",
    email: "bruna.souza@gmail.com",
    password: "123456",
    role: "Consultora de Vendas",
    parentId: "USR-004",
    commissionRate: 5.0,
    phone: "(41) 99655-3344",
    createdAt: "08/03/2026",
    status: "Ativo"
  },
  {
    id: "USR-009",
    name: "Lucas Mendes",
    email: "lucas.mendes@gmail.com",
    password: "123456",
    role: "Afiliado Comercial",
    parentId: "USR-005",
    commissionRate: 3.5,
    phone: "(41) 98400-5566",
    createdAt: "15/03/2026",
    status: "Ativo"
  },
  {
    id: "USR-010",
    name: "Fernanda Ribeiro",
    email: "fernanda.ribeiro@gmail.com",
    password: "123456",
    role: "Afiliada / Vendedora",
    parentId: "USR-007",
    commissionRate: 2.5,
    phone: "(41) 99111-7788",
    createdAt: "01/04/2026",
    status: "Ativo"
  }
];
