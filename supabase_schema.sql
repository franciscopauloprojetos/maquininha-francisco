-- ==============================================================================
-- Schema e Dados Iniciais para o Supabase - Maquininha Francisco / KONZPAY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date TEXT NOT NULL,
    company TEXT NOT NULL,
    partner TEXT NOT NULL,
    terminal TEXT NOT NULL,
    method TEXT NOT NULL,
    installments TEXT DEFAULT '1x' NOT NULL,
    brand TEXT NOT NULL,
    gross_amount NUMERIC(12, 2) NOT NULL,
    fee NUMERIC(12, 2) NOT NULL,
    net_amount NUMERIC(12, 2) NOT NULL,
    spread NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    partner_commission NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    client_paid NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    client_commission NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Aprovada', 'Rejeitada', 'Pendente', 'Cancelada', 'Estornada')),
    provider_account TEXT NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de transações" 
ON public.transactions 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção pública de transações" 
ON public.transactions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização pública de transações" 
ON public.transactions 
FOR UPDATE 
USING (true);

INSERT INTO public.transactions (
    id, date, company, partner, terminal, method, installments, brand,
    gross_amount, fee, net_amount, spread, partner_commission, client_paid, client_commission, status, provider_account
) VALUES
('TX-1001', '27/08/2026 12:38', 'MIRANTE BRISA MAR GASTRONOMIA', 'Alpha Soluções e Pagamentos', '1733773143', 'Débito', '1x', 'Visa', 91.00, 2.89, 88.37, 0.81, 0.00, 0.00, 0.00, 'Aprovada', '001 - Banco do Brasil'),
('TX-1002', '27/08/2026 12:36', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Crédito', '1x', 'Mastercard', 54.00, 5.48, 51.04, 0.53, 0.00, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-1003', '27/08/2026 12:34', 'MIRANTE BRISA MAR GASTRONOMIA', 'Alpha Soluções e Pagamentos', '1733773143', 'Crédito', '1x', 'Visa', 37.00, 4.98, 35.15, 0.36, 0.00, 0.00, 0.00, 'Aprovada', '001 - Banco do Brasil'),
('TX-1004', '27/08/2026 12:32', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Crédito', '1x', 'Visa', 8.00, 5.48, 7.56, 0.31, 0.00, 0.00, 0.00, 'Rejeitada', '341 - Itaú Unibanco'),
('TX-1005', '27/08/2026 12:32', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Crédito', '1x', 'Visa', 8.00, 5.48, 7.56, 0.31, 0.00, 0.00, 0.00, 'Rejeitada', '341 - Itaú Unibanco'),
('TX-1006', '27/08/2026 12:32', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Débito', '1x', 'Mastercard', 8.00, 3.49, 7.72, 0.07, 0.00, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-1007', '27/08/2026 12:26', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Débito', '1x', 'Visa', 34.00, 3.49, 32.81, 0.33, 0.00, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-1008', '27/08/2026 12:21', 'K. SA CAFES ESPECIAIS LTDA', 'Beta Intermediações Comerciais', 'J9B304967194', 'Crédito', '1x', 'Mastercard', 12.00, 5.48, 11.34, 0.11, 0.00, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-1009', '27/08/2026 12:15', 'MIRANTE BRISA MAR GASTRONOMIA', 'Alpha Soluções e Pagamentos', '1733773143', 'Crédito', '1x', 'Mastercard', 80.00, 4.98, 76.01, 0.79, 0.00, 0.00, 0.00, 'Aprovada', '001 - Banco do Brasil')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- Tabela de Usuários e Parceiros da Rede Hierárquica (Multinível)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.network_users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    parent_id TEXT REFERENCES public.network_users(id) ON DELETE SET NULL,
    commission_rate NUMERIC(5, 2) DEFAULT 5.00 NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'Ativo' NOT NULL CHECK (status IN ('Ativo', 'Inativo'))
);

ALTER TABLE public.network_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura pública de usuários da rede" 
ON public.network_users 
FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserção de usuários da rede" 
ON public.network_users 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir atualização de usuários da rede" 
ON public.network_users 
FOR UPDATE 
USING (true);

CREATE POLICY "Permitir exclusão de usuários da rede" 
ON public.network_users 
FOR DELETE 
USING (true);

-- Inserção de Dados Iniciais da Rede de Parceiros
INSERT INTO public.network_users (id, name, email, password_hash, role, parent_id, commission_rate, phone, status) VALUES
('USR-ADMIN', 'Francisco Pereira Paulo', 'franciscopereirapaulo@gmail.com', '1Sucesso#', 'Admin Master', NULL, 15.00, '(41) 99999-8888', 'Ativo'),
('USR-001', 'Alpha Soluções e Pagamentos', 'alpha@solucoes.com.br', '123456', 'Parceiro Master', 'USR-ADMIN', 10.00, '(41) 98888-1111', 'Ativo'),
('USR-002', 'Beta Intermediações Comerciais', 'beta@comercial.com.br', '123456', 'Parceiro Master', 'USR-ADMIN', 10.00, '(41) 97777-2222', 'Ativo'),
('USR-003', 'Delta Pay Serviços', 'delta@deltapay.com.br', '123456', 'Parceiro Master', 'USR-ADMIN', 10.00, '(41) 96666-3333', 'Ativo'),
('USR-004', 'Carlos Silva', 'carlos.silva@gmail.com', '123456', 'Líder Regional', 'USR-001', 7.50, '(41) 98411-2233', 'Ativo'),
('USR-005', 'Mariana Lima', 'mariana.lima@gmail.com', '123456', 'Consultora Senior', 'USR-001', 7.50, '(41) 99122-4455', 'Ativo'),
('USR-006', 'Rodrigo Costa', 'rodrigo.costa@gmail.com', '123456', 'Líder Regional', 'USR-002', 7.50, '(41) 99877-6611', 'Ativo'),
('USR-007', 'João Pedro', 'joao.pedro@gmail.com', '123456', 'Consultor de Vendas', 'USR-004', 5.00, '(41) 98700-1122', 'Ativo'),
('USR-008', 'Bruna Souza', 'bruna.souza@gmail.com', '123456', 'Consultora de Vendas', 'USR-004', 5.00, '(41) 99655-3344', 'Ativo'),
('USR-009', 'Lucas Mendes', 'lucas.mendes@gmail.com', '123456', 'Afiliado Comercial', 'USR-005', 3.50, '(41) 98400-5566', 'Ativo'),
('USR-010', 'Fernanda Ribeiro', 'fernanda.ribeiro@gmail.com', '123456', 'Afiliada / Vendedora', 'USR-007', 2.50, '(41) 99111-7788', 'Ativo')
ON CONFLICT (id) DO NOTHING;

