/**
 * Supabase Client Configuration
 * Substitua com suas credenciais do painel do Supabase (Project Settings > API)
 */

export const SUPABASE_CONFIG = {
  url: window.SUPABASE_URL || localStorage.getItem('supabase_url') || '',
  anonKey: window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key') || ''
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

    // Normalizar nomes de colunas do banco para o padrão JS
    return data.map(row => ({
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
      netAmount: parseFloat(row.net_amount),
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
