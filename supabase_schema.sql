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
