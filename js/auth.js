/**
 * Sistema de Autenticação - KONZPAY
 * Gerenciamento de credenciais de Administrador Master e Sessão
 */

const STORAGE_KEY = 'konzpay_admin_session';

export const ADMIN_CREDENTIALS = {
  email: 'franciscopereirapaulo@gmail.com',
  password: '1Sucesso#',
  user: {
    name: 'Francisco Pereira Paulo',
    shortName: 'Francisco',
    email: 'franciscopereirapaulo@gmail.com',
    role: 'Administrador Master',
    fullAccess: true
  }
};

/**
 * Verifica se o usuário atual está autenticado
 */
export function isAuthenticated() {
  const sessionData = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!sessionData) return false;

  try {
    const parsed = JSON.parse(sessionData);
    return parsed && parsed.email === ADMIN_CREDENTIALS.email;
  } catch (e) {
    return false;
  }
}

/**
 * Retorna os dados do usuário autenticado
 */
export function getCurrentUser() {
  const sessionData = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!sessionData) return null;

  try {
    const parsed = JSON.parse(sessionData);
    return parsed.user || ADMIN_CREDENTIALS.user;
  } catch (e) {
    return ADMIN_CREDENTIALS.user;
  }
}

/**
 * Realiza tentativa de login com validação de credenciais
 */
export function login(email, password, remember = false) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      message: 'Por favor, informe seu email e senha de acesso.'
    };
  }

  if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() && cleanPassword === ADMIN_CREDENTIALS.password) {
    const sessionPayload = {
      email: ADMIN_CREDENTIALS.email,
      user: ADMIN_CREDENTIALS.user,
      loginAt: new Date().toISOString()
    };

    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
      localStorage.removeItem(STORAGE_KEY);
    }

    return {
      success: true,
      user: ADMIN_CREDENTIALS.user
    };
  }

  return {
    success: false,
    message: 'Email ou senha incorretos. Verifique suas credenciais de administrador.'
  };
}

/**
 * Encerra a sessão do usuário
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}
