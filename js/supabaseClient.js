/**
 * Supabase Client Configuration
 * Substitua com suas credenciais do painel do Supabase (Project Settings > API)
 */

export const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || localStorage.getItem('supabase_url') || 'https://zoxevtbyuoxvolcuqrwo.supabase.co',
  anonKey: window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpveGV2dGJ5dW94dm9sY3VxcndvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzgxOTAsImV4cCI6MjEwMzQxNDE5MH0.7WrErrdH_d38eMfZjp5mf6Q_5RvDVBcroBilJEWuv5Q'
};

let supabaseInstance = null;

export function getSupabaseClient() {
  if (supabaseInstance) return supabaseInstance;

  const url = SUPABASE_CONFIG.url;
  const anonKey = SUPABASE_CONFIG.anonKey;

  if (url && anonKey && window.supabase) {
    try {
      supabaseInstance = window.supabase.createClient(url, anonKey);
      console.log('✅ Supabase Client conectado com sucesso!');
      return supabaseInstance;
    } catch (e) {
      console.warn('Erro ao inicializar Supabase:', e);
    }
  }
  return null;
}

export function setSupabaseCredentials(url, anonKey) {
  SUPABASE_CONFIG.url = url.trim();
  SUPABASE_CONFIG.anonKey = anonKey.trim();
  localStorage.setItem('supabase_url', SUPABASE_CONFIG.url);
  localStorage.setItem('supabase_anon_key', SUPABASE_CONFIG.anonKey);
  supabaseInstance = null;
  return getSupabaseClient();
}

/**
 * Buscar transações do Supabase (com fallback gracioso para mockData)
 */
export async function fetchTransactionsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Erro ao consultar Supabase:', error);
      return null;
    }

    const mockCompanies = [
      'Auto Posto Alvorada Ltda', 'Supermercado Real Super', 'Restaurante Sabor & Arte',
      'Boutique Bella Moda', 'Padaria & Confeitaria Estrela', 'Drogaria Central Popular',
      'Tech Prime Eletrônicos', 'Francisco Comércio Varejista', 'Ótica Nova Visão',
      'Mecânica Express Auto', 'ESSENCE BEAUTY MIND', 'WILLYAN', 'ALINE RENATA DA ROSA',
      'EVANDRO CARNIEL', 'VICTOR HUGO ALVES', 'K. SA CAFES ESPECIAIS LTDA'
    ];

    const realRows = (data || []).filter(row => !mockCompanies.includes(row.company));

    // Normalizar nomes de colunas do banco para o padrão JS
    return realRows.map(row => ({
      id: row.id,
      date: row.date,
      company: row.company,
      partner: row.partner,
      terminal: row.terminal,
      method: row.method,
      installments: row.installments || '1x',
      brand: row.brand,
      grossAmount: parseFloat(row.gross_amount),
      fee: parseFloat(row.fee),
      feePercent: row.fee ? `${row.fee}%` : undefined,
      netAmount: parseFloat(row.net_amount),
      spread: row.spread !== undefined && row.spread !== null ? parseFloat(row.spread) : (parseFloat(row.gross_amount) * 0.009),
      partnerCommission: parseFloat(row.partner_commission || 0),
      clientPaid: parseFloat(row.client_paid || 0),
      clientCommission: parseFloat(row.client_commission || 0),
      status: row.status,
      providerAccount: row.provider_account
    }));
  } catch (err) {
    console.error('Falha na requisição ao Supabase:', err);
    return null;
  }
}
