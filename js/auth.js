/**
 * Sistema de Autenticação - KONZPAY
 * Gerenciamento de credenciais de Administrador Master e Usuários da Rede
 */

const STORAGE_KEY = 'konzpay_admin_session';
const NETWORK_USERS_KEY = 'konzpay_network_users_list';

export const ADMIN_CREDENTIALS = {
  id: 'USR-ADMIN',
  email: 'franciscopereirapaulo@gmail.com',
  password: '1Sucesso#',
  user: {
    id: 'USR-ADMIN',
    name: 'Francisco Pereira Paulo',
    shortName: 'Francisco',
    email: 'franciscopereirapaulo@gmail.com',
    role: 'Administrador Master',
    isAdmin: true,
    fullAccess: true
  }
};

export const DEFAULT_ROOT_USERS = [
  {
    id: 'USR-ADMIN',
    name: 'Francisco Pereira Paulo',
    shortName: 'Francisco',
    email: 'franciscopereirapaulo@gmail.com',
    role: 'Administrador Master',
    parentId: null,
    commissionRate: 100,
    phone: '(41) 99999-9999',
    doc: '00.000.000/0001-00',
    createdAt: '01/01/2026',
    status: 'Ativo',
    isAdmin: true
  }
];

/**
 * Retorna todos os usuários da rede (apenas o Administrador Master por padrão)
 */
export function getStoredNetworkUsers() {
  const mockNames = ['Rafael Costa', 'Lucas Mendes', 'Juliana Silveira', 'Bruno Henrique', 'Camila Santos', 'Diego Martins', 'Eduardo Lima'];
  const data = localStorage.getItem(NETWORK_USERS_KEY);
  if (!data) {
    localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(DEFAULT_ROOT_USERS));
    return [...DEFAULT_ROOT_USERS];
  }
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter(u => !mockNames.includes(u.name));
      if (!realOnly.some(u => u.id === 'USR-ADMIN')) {
        realOnly.unshift(...DEFAULT_ROOT_USERS);
      }
      localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(realOnly));
      return realOnly;
    }
    return [...DEFAULT_ROOT_USERS];
  } catch (e) {
    return [...DEFAULT_ROOT_USERS];
  }
}

/**
 * Salva a lista de usuários da rede
 */
export function saveNetworkUsers(users) {
  localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(users));
}

/**
 * Verifica se o usuário atual está autenticado (com persistência permanente de Admin Master)
 */
export function isAuthenticated() {
  const sessionData = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  const explicitLogout = localStorage.getItem('konzpay_explicit_logout');

  if (!sessionData) {
    if (explicitLogout === 'true') {
      return false;
    }
    // Auto-authenticate as Admin Master by default so the session is never lost on refresh
    const defaultSession = {
      email: ADMIN_CREDENTIALS.email,
      user: ADMIN_CREDENTIALS.user,
      loginAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSession));
    } catch (e) {}
    return true;
  }

  try {
    const parsed = JSON.parse(sessionData);
    return parsed && Boolean(parsed.email);
  } catch (e) {
    return false;
  }
}

/**
 * Retorna os dados do usuário autenticado
 */
export function getCurrentUser() {
  const sessionData = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!sessionData) {
    return ADMIN_CREDENTIALS.user;
  }

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
export function login(email, password, remember = true) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanPassword = (password || '').trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      message: 'Por favor, informe seu email e senha de acesso.'
    };
  }

  // Clear explicit logout flag on new login attempt
  try {
    localStorage.removeItem('konzpay_explicit_logout');
  } catch (e) {}

  // 1. Verificar se é o Admin Master
  if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() && cleanPassword === ADMIN_CREDENTIALS.password) {
    const sessionPayload = {
      email: ADMIN_CREDENTIALS.email,
      user: ADMIN_CREDENTIALS.user,
      loginAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));

    return {
      success: true,
      user: ADMIN_CREDENTIALS.user
    };
  }

  // 2. Verificar se é um usuário/parceiro da rede cadastrado pelo Admin
  const networkUsers = getStoredNetworkUsers();
  const user = networkUsers.find(u => u.email.toLowerCase() === cleanEmail);

  if (user && user.password === cleanPassword) {
    if (user.status === 'Inativo') {
      return {
        success: false,
        message: 'Este usuário está inativo no momento. Entre em contato com o administrador.'
      };
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      shortName: user.name.split(' ')[0],
      email: user.email,
      role: user.role,
      parentId: user.parentId,
      commissionRate: user.commissionRate,
      isAdmin: false,
      fullAccess: false
    };

    const sessionPayload = {
      email: user.email,
      user: userPayload,
      loginAt: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));

    return {
      success: true,
      user: userPayload
    };
  }

  return {
    success: false,
    message: 'Email ou senha incorretos. Verifique suas credenciais de acesso.'
  };
}

/**
 * Retorna todos os IDs da sub-árvore de um usuário (ele mesmo + descendentes diretos e indiretos)
 */
export function getUserSubtreeIds(userId, users = getStoredNetworkUsers()) {
  const result = [userId];
  const queue = [userId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = users.filter(u => u.parentId === currentId);
    children.forEach(child => {
      if (!result.includes(child.id)) {
        result.push(child.id);
        queue.push(child.id);
      }
    });
  }

  return result;
}

/**
 * Verifica se um usuário autenticado tem permissão para cadastrar um indicado sob determinado parentId
 */
export function canUserRegisterUnder(currentUserId, targetParentId, users = getStoredNetworkUsers(), isAdmin = false) {
  if (isAdmin) return true;
  const allowedSubtree = getUserSubtreeIds(currentUserId, users);
  return allowedSubtree.includes(targetParentId);
}

/**
 * Encerra a sessão do usuário
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.setItem('konzpay_explicit_logout', 'true');
}
