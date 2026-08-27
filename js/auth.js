/**
 * Sistema de Autenticação - KONZPAY
 * Gerenciamento de credenciais de Administrador Master e Usuários da Rede
 */

import { MOCK_NETWORK_USERS } from './mockData.js';

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

/**
 * Retorna todos os usuários da rede (do storage ou fallback mock)
 */
export function getStoredNetworkUsers() {
  const data = localStorage.getItem(NETWORK_USERS_KEY);
  if (!data) {
    localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(MOCK_NETWORK_USERS));
    return [...MOCK_NETWORK_USERS];
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return [...MOCK_NETWORK_USERS];
  }
}

/**
 * Salva a lista de usuários da rede
 */
export function saveNetworkUsers(users) {
  localStorage.setItem(NETWORK_USERS_KEY, JSON.stringify(users));
}

/**
 * Verifica se o usuário atual está autenticado
 */
export function isAuthenticated() {
  const sessionData = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  if (!sessionData) return false;

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

  // 1. Verificar se é o Admin Master
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

    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
      localStorage.removeItem(STORAGE_KEY);
    }

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
}
