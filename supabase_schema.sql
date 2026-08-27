-- ==============================================================================
-- Schema e Dados Iniciais para o Supabase - Maquininha Francisco / KONZPAY
-- Execute este script no SQL Editor do seu painel do Supabase
-- ==============================================================================

-- 1. Criar Tabela de Transações
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
    partner_commission NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    client_paid NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    client_commission NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Aprovada', 'Pendente', 'Cancelada', 'Estornada')),
    provider_account TEXT NOT NULL
);

-- 2. Habilitar Segurança por Linha (RLS - Row Level Security)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 3. Criar Políticas de Acesso Público para Leitura e Inserção (Anon Key)
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

-- 4. Inserir Dados Iniciais de Transações (Seed Data)
INSERT INTO public.transactions (
    id, date, company, partner, terminal, method, installments, brand,
    gross_amount, fee, net_amount, partner_commission, client_paid, client_commission, status, provider_account
) VALUES
('TX-984210', '2026-08-27 10:45:21', 'Auto Posto Alvorada Ltda', 'Alpha Soluções e Pagamentos', 'Smart-8842 (Móvel Delivery)', 'Crédito à Vista', '1x', 'Mastercard', 320.50, 6.41, 314.09, 4.80, 0.00, 0.00, 'Aprovada', '001 - Banco do Brasil'),
('TX-984209', '2026-08-27 10:22:15', 'Supermercado Real Super', 'Beta Intermediações Comerciais', 'POS-00129 (Balcão 1)', 'Débito', '1x', 'Visa', 184.90, 2.22, 182.68, 2.77, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-984208', '2026-08-27 09:54:02', 'Restaurante Sabor & Arte', 'Alpha Soluções e Pagamentos', 'Smart-9021 (Caixa Principal)', 'PIX QR Code', '1x', 'Elo', 89.00, 0.89, 88.11, 1.33, 0.00, 0.00, 'Aprovada', '001 - Banco do Brasil'),
('TX-984207', '2026-08-27 09:12:44', 'Boutique Bella Moda', 'Nexus Tech Finance', 'POS-00130 (Balcão 2)', 'Crédito Parcelado', '3x', 'Mastercard', 650.00, 22.75, 627.25, 9.75, 35.00, 0.05, 'Aprovada', '033 - Santander Brasil'),
('TX-984206', '2026-08-26 18:30:19', 'Padaria & Confeitaria Estrela', 'Beta Intermediações Comerciais', 'Smart-9022 (Área Externa)', 'Débito', '1x', 'Mastercard', 45.20, 0.54, 44.66, 0.68, 0.00, 0.00, 'Aprovada', '341 - Itaú Unibanco'),
('TX-984205', '2026-08-26 17:15:33', 'Drogaria Central Popular', 'Delta Pay Serviços', 'Pinpad-4011 (Terminal Integrado)', 'Crédito à Vista', '1x', 'Visa', 210.80, 4.22, 206.58, 3.16, 0.00, 0.00, 'Aprovada', '422 - Banco Safra Adquirência'),
('TX-984204', '2026-08-26 16:08:12', 'Tech Prime Eletrônicos', 'Alpha Soluções e Pagamentos', 'POS-00129 (Balcão 1)', 'Crédito Parcelado', '10x', 'Elo', 1890.00, 94.50, 1795.50, 28.35, 120.00, 0.00, 'Aprovada', '001 - Banco do Brasil'),
('TX-984203', '2026-08-26 14:40:50', 'Francisco Comércio Varejista', 'Francisco Representações', 'Smart-8842 (Móvel Delivery)', 'Crédito Parcelado', '6x', 'Hipercard', 430.00, 17.20, 412.80, 6.45, 45.00, 0.00, 'Pendente', '033 - Santander Brasil'),
('TX-984202', '2026-08-25 19:22:11', 'Ótica Nova Visão', 'Nexus Tech Finance', 'POS-00130 (Balcão 2)', 'Crédito Parcelado', '4x', 'Mastercard', 780.00, 27.30, 752.70, 11.70, 65.00, 0.00, 'Aprovada', '260 - Nu Pagamentos S.A.'),
('TX-984201', '2026-08-25 11:10:05', 'Mecânica Express Auto', 'Delta Pay Serviços', 'Smart-9021 (Caixa Principal)', 'Crédito à Vista', '1x', 'Visa', 520.00, 10.40, 509.60, 7.80, 0.00, 0.00, 'Cancelada', '422 - Banco Safra Adquirência'),
('TX-984200', '2026-08-24 15:45:00', 'Supermercado Real Super', 'Beta Intermediações Comerciais', 'POS-00129 (Balcão 1)', 'Voucher Refeição/Alimentação', '1x', 'Alelo', 142.30, 4.98, 137.32, 2.13, 0.00, 0.00, 'Estornada', '341 - Itaú Unibanco')
ON CONFLICT (id) DO NOTHING;
