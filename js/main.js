import {
  INITIAL_KPIS,
  MOCK_COMPANIES,
  MOCK_PARTNERS,
  MOCK_TERMINALS,
  MOCK_PAYMENT_METHODS,
  MOCK_INSTALLMENTS,
  MOCK_BRANDS,
  MOCK_STATUSES,
  MOCK_PROVIDER_ACCOUNTS,
  MOCK_SPREADS,
  MOCK_TRANSACTIONS,
  MOCK_COMPANIES_DATA,
  MOCK_NETWORK_USERS,
  MOCK_COMMISSIONS_DATA
} from './mockData.js';

import {
  getSupabaseClient,
  setSupabaseCredentials,
  fetchTransactionsFromSupabase,
  SUPABASE_CONFIG
} from './supabaseClient.js';

import {
  isAuthenticated,
  getCurrentUser,
  login,
  logout,
  ADMIN_CREDENTIALS,
  getStoredNetworkUsers,
  saveNetworkUsers,
  getUserSubtreeIds,
  canUserRegisterUnder
} from './auth.js';

import {
  getStoredGeminiKey,
  saveGeminiKey,
  extractTransactionsWithGemini,
  parseTxDateTime
} from './geminiService.js';

// Limpeza automática de dados mocados herdados do cache local
const MOCK_COMPANY_BLACKLIST = [
  'Auto Posto Alvorada Ltda', 'Supermercado Real Super', 'Restaurante Sabor & Arte',
  'Boutique Bella Moda', 'Padaria & Confeitaria Estrela', 'Drogaria Central Popular',
  'Tech Prime Eletrônicos', 'Francisco Comércio Varejista', 'Ótica Nova Visão',
  'Mecânica Express Auto', 'ESSENCE BEAUTY MIND', 'WILLYAN', 'ALINE RENATA DA ROSA',
  'EVANDRO CARNIEL', 'VICTOR HUGO ALVES', 'K. SA CAFES ESPECIAIS LTDA'
];

(function purgeLegacyMockData() {
  try {
    const purgeKey = 'konzpay_mock_purged_v2';
    if (!localStorage.getItem(purgeKey)) {
      localStorage.removeItem('konzpay_saved_transactions');
      localStorage.removeItem('konzpay_saved_companies');
      localStorage.removeItem('konzpay_saved_commissions');
      localStorage.removeItem('konzpay_network_users_list');
      localStorage.setItem(purgeKey, 'true');
    }
  } catch (e) {}
})();

function isMockItem(item) {
  if (!item) return false;
  const name = item.company || item.name || '';
  if (MOCK_COMPANY_BLACKLIST.includes(name)) return true;
  if (item.id && (item.id.startsWith('TX-1') || item.id.startsWith('TX-MOCK') || item.id === 'EMP-001')) {
    if (name !== 'MIRANTE BRISA MAR GASTRONOMIA') return true;
  }
  return false;
}

// LocalStorage helpers for real persistence
export function getStoredTransactions() {
  try {
    const saved = localStorage.getItem('konzpay_saved_transactions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const realOnly = parsed.filter(t => !isMockItem(t));
        realOnly.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));
        if (realOnly.length !== parsed.length) {
          localStorage.setItem('konzpay_saved_transactions', JSON.stringify(realOnly));
        }
        return realOnly;
      }
    }
  } catch (e) {}
  return [];
}

export function saveTransactions(list) {
  try {
    const realOnly = (list || []).filter(t => !isMockItem(t));
    localStorage.setItem('konzpay_saved_transactions', JSON.stringify(realOnly));
  } catch (e) {}
}

// Application State - Transações (100% Real, sem dados mocados)
let currentTransactions = getStoredTransactions();
let filteredTransactions = [...currentTransactions];
let currentPage = 1;
let recordsPerPage = localStorage.getItem('konzpay_rows_per_page') === 'all'
  ? Infinity
  : (parseInt(localStorage.getItem('konzpay_rows_per_page')) || 10);
let currentSort = { column: 'date', order: 'desc' };
let selectedTransactionIds = new Set();
let pendingDeleteCallback = null;

// Modal de Confirmação de Exclusão Clean Fintech
export function openDeleteConfirmModal({ title, message, onConfirm }) {
  const modal = document.getElementById('deleteConfirmModal');
  const titleEl = document.getElementById('deleteConfirmTitle');
  const msgEl = document.getElementById('deleteConfirmMessage');
  if (titleEl && title) titleEl.textContent = title;
  if (msgEl && message) msgEl.innerHTML = message;
  pendingDeleteCallback = onConfirm;
  if (modal) modal.classList.add('open');
  refreshIcons();
}

export function closeDeleteConfirmModal() {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('open');
  pendingDeleteCallback = null;
}

// LocalStorage helpers for companies persistence
export function getStoredCompanies() {
  try {
    const saved = localStorage.getItem('konzpay_saved_companies');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const realOnly = parsed.filter(c => !isMockItem(c));
        if (realOnly.length !== parsed.length) {
          localStorage.setItem('konzpay_saved_companies', JSON.stringify(realOnly));
        }
        return realOnly;
      }
    }
  } catch (e) {}
  return [];
}

export function saveCompanies(list) {
  try {
    const realOnly = (list || []).filter(c => !isMockItem(c));
    localStorage.setItem('konzpay_saved_companies', JSON.stringify(realOnly));
  } catch (e) {}
}

// LocalStorage helpers for commissions persistence
export function getStoredCommissions() {
  try {
    const saved = localStorage.getItem('konzpay_saved_commissions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const realOnly = parsed.filter(c => !isMockItem(c));
        if (realOnly.length !== parsed.length) {
          localStorage.setItem('konzpay_saved_commissions', JSON.stringify(realOnly));
        }
        return realOnly;
      }
    }
  } catch (e) {}
  return [];
}

export function saveCommissions(list) {
  try {
    const realOnly = (list || []).filter(c => !isMockItem(c));
    localStorage.setItem('konzpay_saved_commissions', JSON.stringify(realOnly));
  } catch (e) {}
}

// Application State - Empresas (100% Real, sem dados mocados)
let currentCompanies = getStoredCompanies();
let filteredCompanies = [...currentCompanies];
let companiesCurrentPage = 1;
const companiesPerPage = 8;
let companiesSort = { column: 'createdAt', order: 'desc' };
let selectedCompanyIds = new Set();

// Application State - Comissões (100% Real, sem dados mocados)
let currentCommissions = getStoredCommissions();
let filteredCommissions = [...currentCommissions];
let commissionsCurrentPage = 1;
const commissionsPerPage = 8;
let commissionsSort = { column: 'date', order: 'desc' };

// Application State - Rede Hierárquica
let currentNetworkUsers = getStoredNetworkUsers();
let filteredNetworkUsers = [...currentNetworkUsers];
let currentNetworkViewMode = 'tree'; // 'tree' ou 'table'
let companyIdBeingConfigured = null;

// Helper: Normalizar nome de empresa para correspondência inteligente
export function normalizeCompanyName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,\-\/\\_#@!$%&*]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b(ltda|me|epp|s\/a|sa|eireli|eir|meu)\b/gi, '')
    .trim();
}

// Helper: Buscar empresa existente por nome com correspondência inteligente
export function findCompanyMatch(rawName, companies = currentCompanies) {
  if (!rawName) return null;
  const rawNorm = normalizeCompanyName(rawName);
  if (!rawNorm) return null;

  // 1. Correspondência exata ou normalizada idêntica
  for (const comp of companies) {
    if (comp.name.toUpperCase() === rawName.toUpperCase()) return comp;
    if (normalizeCompanyName(comp.name) === rawNorm) return comp;
  }

  // 2. Correspondência parcial / sufixos
  for (const comp of companies) {
    const compNorm = normalizeCompanyName(comp.name);
    if (compNorm.length >= 4 && rawNorm.length >= 4) {
      if (compNorm.includes(rawNorm) || rawNorm.includes(compNorm)) return comp;
    }
  }

  return null;
}

// Helper: Obter dados da entidade Upline (seja usuário ou empresa parceira/vendedora)
export function getUplineEntity(id) {
  if (!id || id === 'USR-ADMIN') {
    return { id: 'USR-ADMIN', name: 'Francisco Pereira Paulo', role: 'Administrador Master' };
  }
  const user = currentNetworkUsers.find(u => u.id === id);
  if (user) return user;
  const comp = currentCompanies.find(c => c.id === id);
  if (comp) return { id: comp.id, name: comp.name, role: 'Empresa Parceira / Vendedora', commissionRate: comp.commissionRate };
  return { id, name: 'Francisco Pereira Paulo', role: 'Administrador' };
}

// Helper: Obter cadeia de uplines em cascata para repasse de comissões
export function getUplineChain(registeredById, networkUsers = currentNetworkUsers, companies = currentCompanies) {
  const chain = [];
  let currentId = registeredById;
  const visited = new Set();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    let entity = networkUsers.find(u => u.id === currentId);
    if (!entity) {
      const comp = companies.find(c => c.id === currentId);
      if (comp) {
        entity = {
          id: comp.id,
          name: comp.name,
          role: 'Empresa Parceira / Vendedora',
          parentId: comp.registeredBy,
          commissionRate: comp.commissionRate !== undefined ? comp.commissionRate : 0.5,
          isCompany: true
        };
      }
    }

    if (entity) {
      if (entity.id !== 'USR-ADMIN') {
        chain.push({
          id: entity.id,
          name: entity.name,
          role: entity.role || 'Vendedor',
          rate: Number(entity.commissionRate !== undefined ? entity.commissionRate : 0.5),
          parentId: entity.parentId
        });
      }
      currentId = entity.parentId;
    } else {
      break;
    }
  }

  return chain;
}

// Initialize Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Format currency in BRL
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// ==========================================================================
// MOTOR DE DROPDOWNS CUSTOMIZADOS FINTECH (CUSTOM SELECT SYSTEM)
// ==========================================================================

function initCustomSelects() {
  const selects = document.querySelectorAll('select.custom-select');

  selects.forEach(select => {
    const wrapper = select.closest('.input-wrapper');
    if (!wrapper) return;

    // Check if trigger text element already exists
    let triggerText = wrapper.querySelector('.custom-select-trigger-text');
    if (!triggerText) {
      triggerText = document.createElement('span');
      triggerText.className = 'custom-select-trigger-text';
      const leftIcon = wrapper.querySelector('.input-icon-left');
      if (leftIcon) {
        leftIcon.insertAdjacentElement('afterend', triggerText);
      } else {
        wrapper.insertAdjacentElement('afterbegin', triggerText);
      }
    }

    // Check if floating menu already exists
    let menu = wrapper.querySelector('.custom-select-floating-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'custom-select-floating-menu';
      menu.style.display = 'none';
      wrapper.appendChild(menu);
    }

    // Function to render / update menu options
    const renderOptions = (filterSearch = '') => {
      const options = Array.from(select.options);
      const selectedIndex = select.selectedIndex >= 0 ? select.selectedIndex : 0;
      const currentSelectedOption = options[selectedIndex];

      // Update trigger text
      if (currentSelectedOption) {
        triggerText.textContent = currentSelectedOption.textContent || 'Selecionar';
        if (currentSelectedOption.value === '') {
          triggerText.classList.add('is-placeholder');
        } else {
          triggerText.classList.remove('is-placeholder');
        }
      }

      // Build menu HTML
      let html = '';

      // Include search box if more than 4 options
      if (options.length > 4) {
        html += `
          <div class="custom-select-search-box">
            <i data-lucide="search"></i>
            <input type="text" class="custom-select-search-input" placeholder="Buscar opção..." value="${filterSearch}">
          </div>
        `;
      }

      const filteredOptions = filterSearch.trim() === ''
        ? options
        : options.filter(opt => opt.textContent.toLowerCase().includes(filterSearch.toLowerCase()));

      html += `<div class="custom-select-options-list">`;

      if (filteredOptions.length === 0) {
        html += `<div class="custom-select-empty-msg">Nenhuma opção encontrada</div>`;
      } else {
        filteredOptions.forEach(opt => {
          const isSelected = opt.value === select.value;
          html += `
            <div class="custom-select-item ${isSelected ? 'is-selected' : ''}" data-val="${opt.value}">
              <span>${opt.textContent}</span>
              <i data-lucide="check" class="custom-item-check"></i>
            </div>
          `;
        });
      }

      html += `</div>`;
      menu.innerHTML = html;
      refreshIcons();

      // Attach search event
      const searchInput = menu.querySelector('.custom-select-search-input');
      if (searchInput) {
        searchInput.addEventListener('click', (e) => e.stopPropagation());
        searchInput.addEventListener('input', (e) => {
          renderOptions(e.target.value);
          const newSearchInput = menu.querySelector('.custom-select-search-input');
          if (newSearchInput) {
            newSearchInput.focus();
            newSearchInput.setSelectionRange(newSearchInput.value.length, newSearchInput.value.length);
          }
        });
      }

      // Attach item click event
      menu.querySelectorAll('.custom-select-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          const val = item.getAttribute('data-val');
          select.value = val;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          closeAllCustomSelects();
          syncAllCustomSelects();
        });
      });
    };

    renderOptions();

    // Attach click listener on wrapper to toggle open/close
    if (!wrapper.dataset.customSelectAttached) {
      wrapper.dataset.customSelectAttached = 'true';

      wrapper.addEventListener('click', (e) => {
        if (menu.contains(e.target)) return;

        const isOpen = menu.style.display === 'flex';
        closeAllCustomSelects();

        if (!isOpen) {
          renderOptions();
          menu.style.display = 'flex';
          wrapper.classList.add('is-dropdown-open');
          const searchInput = menu.querySelector('.custom-select-search-input');
          if (searchInput) {
            setTimeout(() => searchInput.focus(), 50);
          }
        }
      });
    }
  });
}

function closeAllCustomSelects() {
  document.querySelectorAll('.custom-select-floating-menu').forEach(menu => {
    menu.style.display = 'none';
  });
  document.querySelectorAll('.input-wrapper.is-dropdown-open').forEach(w => {
    w.classList.remove('is-dropdown-open');
  });
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.input-wrapper')) {
    closeAllCustomSelects();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeAllCustomSelects();
  }
});

function syncAllCustomSelects() {
  initCustomSelects();
}

// Populate dropdown options
function populateSelect(elementId, options) {
  const select = document.getElementById(elementId);
  if (!select) return;

  select.innerHTML = '';
  options.forEach((opt, index) => {
    const option = document.createElement('option');
    option.value = index === 0 ? '' : opt;
    option.textContent = opt;
    select.appendChild(option);
  });

  syncAllCustomSelects();
}

// Dynamic Transaction Filter Options Synchronizer
function refreshTransactionFiltersOptions(txs = currentTransactions) {
  const companies = ['Todas as empresas', ...Array.from(new Set(txs.map(t => t.company).filter(Boolean))).sort()];
  const partners = ['Todos os parceiros', ...Array.from(new Set(txs.map(t => t.partner).filter(Boolean))).sort()];
  const terminals = ['Todos os terminais', ...Array.from(new Set(txs.map(t => t.terminal).filter(Boolean))).sort()];
  const methods = ['Todas as formas', ...Array.from(new Set(txs.map(t => t.method).filter(Boolean))).sort()];
  const installments = ['Todas as parcelas', ...Array.from(new Set(txs.map(t => t.installments).filter(Boolean))).sort()];
  const brands = ['Todas as bandeiras', ...Array.from(new Set(txs.map(t => t.brand).filter(Boolean))).sort()];
  const statuses = ['Todos os status', ...Array.from(new Set(txs.map(t => t.status).filter(Boolean))).sort()];
  const accounts = ['Todas as contas', ...Array.from(new Set(txs.map(t => t.providerAccount).filter(Boolean))).sort()];
  const spreads = ['Todos os spreads', '0.50%', '0.70%', '0.90%', '1.20%'];

  populateSelect('filterEmpresas', companies.length > 1 ? companies : ['Todas as empresas']);
  populateSelect('filterFormaPagamento', methods.length > 1 ? methods : ['Todas as formas', 'Débito', 'Crédito à Vista', 'Crédito Parcelado', 'PIX QR Code']);
  populateSelect('filterParcelas', installments.length > 1 ? installments : ['Todas as parcelas', '1x', '2x', '3x', '4x', '5x', '6x']);
  populateSelect('filterBandeira', brands.length > 1 ? brands : ['Todas as bandeiras', 'Mastercard', 'Visa', 'Elo', 'Maestro', 'Pix']);
  populateSelect('filterStatus', statuses.length > 1 ? statuses : ['Todos os status', 'Aprovada', 'Rejeitada', 'Estornada']);
  populateSelect('filterSpread', spreads);

  // Preencher datas de início e término com as datas limites do extrato
  if (txs.length > 0) {
    const dates = txs.map(t => {
      const dStr = t.date ? t.date.split(' ')[0] : '';
      if (!dStr || !dStr.includes('/')) return null;
      const [d, m, y] = dStr.split('/').map(Number);
      return { str: dStr, time: new Date(y, m - 1, d).getTime() };
    }).filter(Boolean).sort((a, b) => a.time - b.time);

    if (dates.length > 0) {
      const minDate = dates[0].str;
      const maxDate = dates[dates.length - 1].str;
      const inputInicio = document.getElementById('filterDataInicio');
      const inputFim = document.getElementById('filterDataTermino');
      if (inputInicio && !inputInicio.value) inputInicio.value = minDate;
      if (inputFim && !inputFim.value) inputFim.value = maxDate;
    }
  }
}

// Initialize all filters dropdowns
function initFilters() {
  refreshTransactionFiltersOptions(currentTransactions);
  initCustomSelects();
}

// Update KPI UI elements
function updateKPIs(kpis) {
  const elFat = document.getElementById('valTotalFaturamento');
  if (elFat) elFat.textContent = formatBRL(kpis.totalFaturamento);

  const elEmp = document.getElementById('valTotalEmpresa');
  if (elEmp) elEmp.textContent = formatBRL(kpis.totalEmpresa);

  const elLiq = document.getElementById('valTotalLiquido');
  if (elLiq) elLiq.textContent = formatBRL(kpis.totalLiquido);

  const elPar = document.getElementById('valTotalParceiro');
  if (elPar) elPar.textContent = formatBRL(kpis.totalParceiro);

  const elPago = document.getElementById('valTotalPagoClientes');
  if (elPago) elPago.textContent = formatBRL(kpis.totalPagoClientes);

  const elCom = document.getElementById('valTotalComissaoCliente');
  if (elCom) elCom.textContent = formatBRL(kpis.totalComissaoCliente);
}

// Calculate KPIs based on a list of transactions
function calculateKPIsFromTransactions(list) {
  if (!list || list.length === 0) {
    return {
      totalFaturamento: 0,
      totalEmpresa: 0,
      totalLiquido: 0,
      totalParceiro: 0,
      totalPagoClientes: 0,
      totalComissaoCliente: 0
    };
  }

  const faturamento = list.reduce((acc, tx) => acc + (tx.grossAmount || 0), 0);
  const liquido = list.reduce((acc, tx) => acc + (tx.netAmount || 0), 0);
  const spread = list.reduce((acc, tx) => acc + (tx.spread || 0), 0);
  const parceiro = spread * 0.4;
  const empresa = liquido - parceiro;
  const pagoClientes = list.reduce((acc, tx) => acc + (tx.clientPaid || 0), 0);
  const comissaoCliente = spread * 0.6;

  return {
    totalFaturamento: faturamento,
    totalEmpresa: empresa,
    totalLiquido: liquido,
    totalParceiro: parceiro,
    totalPagoClientes: pagoClientes,
    totalComissaoCliente: comissaoCliente
  };
}

// Get Card Brand SVG Icon (100% visible, centered and sharp)
function getBrandIcon(brand) {
  const b = (brand || '').toLowerCase();
  if (b.includes('visa')) {
    return `
      <svg width="32" height="13" viewBox="0 0 32 13" fill="none">
        <text x="1" y="11" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="12.5" font-weight="900" font-style="italic" fill="#1434CB" letter-spacing="-0.5">VISA</text>
      </svg>
    `;
  }
  if (b.includes('maestro')) {
    return `
      <svg width="24" height="16" viewBox="0 0 32 20" fill="none">
        <circle cx="11" cy="10" r="9" fill="#EB001B"/>
        <circle cx="21" cy="10" r="9" fill="#00A2E8" fill-opacity="0.88"/>
      </svg>
    `;
  }
  if (b.includes('master')) {
    return `
      <svg width="24" height="16" viewBox="0 0 32 20" fill="none">
        <circle cx="11" cy="10" r="9" fill="#EB001B"/>
        <circle cx="21" cy="10" r="9" fill="#F79E1B" fill-opacity="0.88"/>
      </svg>
    `;
  }
  if (b.includes('elo')) {
    return `
      <svg width="26" height="14" viewBox="0 0 28 14" fill="none">
        <text x="14" y="11" font-family="'Plus Jakarta Sans', Arial, sans-serif" font-size="11" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="-0.5">elo</text>
      </svg>
    `;
  }
  if (b.includes('hiper')) {
    return `
      <svg width="34" height="14" viewBox="0 0 36 14" fill="none">
        <rect width="36" height="14" rx="2.5" fill="#B91C1C"/>
        <text x="18" y="10.5" font-family="Arial, sans-serif" font-size="8" font-weight="800" font-style="italic" fill="#FFFFFF" text-anchor="middle">HIPER</text>
      </svg>
    `;
  }
  if (b.includes('pix')) {
    return `<img src="assets/logo%20pix%20bandeira.svg" alt="Pix" style="width: 20px; height: 20px; object-fit: contain; display: block;" onerror="this.src='assets/pix.svg'">`;
  }
  if (b.includes('amex') || b.includes('american')) {
    return `
      <svg width="30" height="14" viewBox="0 0 32 14" fill="none">
        <rect width="32" height="14" rx="2" fill="#006FCF"/>
        <text x="16" y="10" font-family="Arial, sans-serif" font-size="7.5" font-weight="900" fill="#FFFFFF" text-anchor="middle">AMEX</text>
      </svg>
    `;
  }
  return `<span style="font-size: 10px; font-weight: 700; color: #475569;">${brand}</span>`;
}

// Format badge based on status
function getStatusBadge(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('aprovad')) {
    return `<span class="status-pill status-approved">Aprovada</span>`;
  }
  if (s.includes('rejeit') || s.includes('cancel')) {
    return `<span class="status-pill status-rejected">Rejeitada</span>`;
  }
  if (s.includes('pendent')) {
    return `<span class="status-pill status-pending">Pendente</span>`;
  }
  return `<span class="status-pill status-refunded">${status}</span>`;
}

// Helper: Atualizar estado visual da seleção de transações e barra de exclusão em massa
export function updateTransactionSelectionState() {
  const bulkBar = document.getElementById('transactionsBulkActionBar');
  const countText = document.getElementById('bulkDeleteTxCountText');
  const checkAll = document.getElementById('checkAllTransactions');

  if (bulkBar && countText) {
    if (selectedTransactionIds.size > 0) {
      bulkBar.style.display = 'inline-flex';
      countText.textContent = `Excluir Selecionadas (${selectedTransactionIds.size})`;
    } else {
      bulkBar.style.display = 'none';
    }
  }

  if (checkAll) {
    const isAllRows = recordsPerPage === Infinity;
    const totalRecords = filteredTransactions.length;
    const startIndex = isAllRows ? 0 : (currentPage - 1) * recordsPerPage;
    const endIndex = isAllRows ? totalRecords : Math.min(startIndex + recordsPerPage, totalRecords);
    const currentSlice = filteredTransactions.slice(startIndex, endIndex);

    if (currentSlice.length > 0 && currentSlice.every(t => selectedTransactionIds.has(t.id))) {
      checkAll.checked = true;
      checkAll.indeterminate = false;
    } else if (currentSlice.some(t => selectedTransactionIds.has(t.id))) {
      checkAll.checked = false;
      checkAll.indeterminate = true;
    } else {
      checkAll.checked = false;
      checkAll.indeterminate = false;
    }
  }
}

// Render transactions table
function renderTable() {
  const tbody = document.getElementById('transactionsTableBody');
  const countEl = document.getElementById('tableRecordCount');
  if (!tbody) return;

  // Sorting
  filteredTransactions.sort((a, b) => {
    if (currentSort.column === 'date') {
      const timeA = parseTxDateTime(a.date, a.time);
      const timeB = parseTxDateTime(b.date, b.time);
      return currentSort.order === 'asc' ? timeA - timeB : timeB - timeA;
    }

    let valA = a[currentSort.column];
    let valB = b[currentSort.column];

    if (currentSort.column === 'clientPaid') {
      valA = (a.clientPaid !== null && a.clientPaid !== undefined && !isNaN(a.clientPaid))
        ? a.clientPaid
        : (a.netAmount !== null && a.netAmount !== undefined && !isNaN(a.netAmount) ? a.netAmount : 0);
      valB = (b.clientPaid !== null && b.clientPaid !== undefined && !isNaN(b.clientPaid))
        ? b.clientPaid
        : (b.netAmount !== null && b.netAmount !== undefined && !isNaN(b.netAmount) ? b.netAmount : 0);
    }

    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    if (typeof valA === 'string') {
      return currentSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return currentSort.order === 'asc' ? valA - valB : valB - valA;
  });

  const totalRecords = filteredTransactions.length;
  countEl.innerHTML = `Exibindo <strong>${totalRecords}</strong> transações`;

  // Estado Vazio (Zero transações)
  if (totalRecords === 0) {
    if (currentTransactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 60px 20px; background: #ffffff;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #fffbeb; border: 1px solid #fef3c7; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">
              <i data-lucide="inbox" style="width: 26px; height: 26px; color: #d97706;"></i>
            </div>
            <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">Nenhuma transação carregada</h4>
            <p style="font-size: 13px; color: #64748b; margin-bottom: 16px; max-width: 420px; margin-left: auto; margin-right: auto;">Importe um relatório de vendas em PDF ou imagem para analisar todas as transações, taxas e repasses.</p>
            <button type="button" class="btn btn-primary-yellow" id="btnEmptyStateImport" style="background: #facc15; color: #0f172a; font-weight: 700; border: 1px solid #eab308; display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
              <i data-lucide="upload-cloud" style="width: 16px; height: 16px;"></i>
              <span>Importar Primeiro Relatório</span>
            </button>
          </td>
        </tr>
      `;
      const emptyImportBtn = document.getElementById('btnEmptyStateImport');
      if (emptyImportBtn) {
        emptyImportBtn.addEventListener('click', () => {
          document.getElementById('btnOpenGeminiImportModal')?.click();
        });
      }
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8; background: #ffffff;">
            Nenhuma transação encontrada com os filtros aplicados.
          </td>
        </tr>
      `;
    }
    updateTransactionSelectionState();
    renderPagination(1);
    refreshIcons();
    return;
  }

  // Paginação e Modo de Visualização (10, 50, 100 ou Todas)
  const isAllRows = recordsPerPage === Infinity;
  const totalPages = isAllRows ? 1 : (Math.ceil(totalRecords / recordsPerPage) || 1);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = isAllRows ? 0 : (currentPage - 1) * recordsPerPage;
  const endIndex = isAllRows ? totalRecords : Math.min(startIndex + recordsPerPage, totalRecords);
  const currentSlice = filteredTransactions.slice(startIndex, endIndex);

  tbody.innerHTML = currentSlice.map(tx => {
    let dateOnly = tx.date;
    let timeOnly = tx.time || '12:00';
    if (tx.date && tx.date.includes(' ')) {
      const parts = tx.date.split(' ');
      dateOnly = parts[0];
      timeOnly = parts[1].slice(0, 5);
    }

    const clientPaidVal = (tx.clientPaid !== null && tx.clientPaid !== undefined && !isNaN(tx.clientPaid))
      ? tx.clientPaid
      : (tx.netAmount !== null && tx.netAmount !== undefined && !isNaN(tx.netAmount) ? tx.netAmount : 0);

    const isChecked = selectedTransactionIds.has(tx.id) ? 'checked' : '';

    return `
      <tr>
        <td style="width: 44px; text-align: center;">
          <input type="checkbox" class="tx-row-select" data-id="${tx.id}" ${isChecked} style="cursor: pointer; width: 16px; height: 16px; accent-color: #1d68d8;">
        </td>
        <td>
          <div class="cell-date">
            <span class="date-day">${dateOnly}</span>
            <span class="date-time">${timeOnly}</span>
          </div>
        </td>
        <td class="cell-company" title="${tx.company}">${tx.company}</td>
        <td>
          <div class="cell-payment">
            <div class="payment-info" title="${tx.method}">
              <span class="payment-method-name" data-tooltip="${tx.method}">${tx.method}</span>
              <span class="payment-installments">${tx.installments || '1x'}</span>
            </div>
            <div class="brand-badge" title="${tx.brand}">
              ${getBrandIcon(tx.brand)}
            </div>
          </div>
        </td>
        <td>${getStatusBadge(tx.status)}</td>
        <td class="cell-gross">${formatBRL(tx.grossAmount)}</td>
        <td class="cell-client-paid" style="text-align: center; font-weight: 700; color: #059669;">
          ${formatBRL(clientPaidVal)}
        </td>
      </tr>
    `;
  }).join('');

  // Vincular eventos aos checkboxes de linha
  tbody.querySelectorAll('.tx-row-select').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const id = e.target.getAttribute('data-id');
      if (e.target.checked) {
        selectedTransactionIds.add(id);
      } else {
        selectedTransactionIds.delete(id);
      }
      updateTransactionSelectionState();
    });
  });

  updateTransactionSelectionState();
  renderPagination(totalPages);
  refreshIcons();
}

// Render Pagination controls (com janela compacta e inteligente)
function renderPagination(totalPages) {
  const info = document.getElementById('paginationInfo');
  const controls = document.getElementById('paginationControls');
  if (!info || !controls) return;

  const totalRecords = filteredTransactions.length;
  if (recordsPerPage === Infinity || totalRecords === 0) {
    info.textContent = `Exibindo todas as ${totalRecords} transações`;
    controls.innerHTML = '';
    return;
  }

  info.textContent = `Página ${currentPage} de ${totalPages} (${totalRecords} transações)`;

  if (totalPages <= 1) {
    controls.innerHTML = '';
    return;
  }

  let buttonsHtml = `
    <button class="page-btn" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''} title="Página Anterior">
      <i data-lucide="chevron-left" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  // Janela compacta inteligente (evita 32 botões)
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    if (!pages.includes(totalPages)) pages.push(totalPages);
  }

  pages.forEach(p => {
    if (p === '...') {
      buttonsHtml += `<span style="padding: 0 4px; color: #94a3b8; font-weight: 700; font-size: 13px;">...</span>`;
    } else {
      buttonsHtml += `
        <button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }
  });

  buttonsHtml += `
    <button class="page-btn" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''} title="Próxima Página">
      <i data-lucide="chevron-right" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  controls.innerHTML = buttonsHtml;

  // Add click handlers
  controls.querySelectorAll('button[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.getAttribute('data-page'));
      renderTable();
    });
  });

  const prevBtn = document.getElementById('btnPrevPage');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }

  const nextBtn = document.getElementById('btnNextPage');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });
  }

  refreshIcons();
}

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i data-lucide="check-circle"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Show transaction details modal
function showTransactionDetails(id) {
  const tx = currentTransactions.find(t => t.id === id);
  if (!tx) return;

  const modal = document.getElementById('detailsModal');
  const title = document.getElementById('detailsModalTitle');
  const content = document.getElementById('detailsModalContent');

  title.textContent = `Detalhes da Transação: ${tx.id}`;
  content.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 13.5px;">
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Data e Hora</div>
        <div style="font-weight: 600; color: #0f172a;">${tx.date}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Status</div>
        <div>${getStatusBadge(tx.status)}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Empresa</div>
        <div style="font-weight: 600; color: #0f172a;">${tx.company}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Parceiro</div>
        <div style="font-weight: 600; color: #0f172a;">${tx.partner}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Terminal</div>
        <div>${tx.terminal}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Conta Provedor</div>
        <div>${tx.providerAccount}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Forma de Pagamento</div>
        <div>${tx.method} (${tx.installments}) - ${tx.brand}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Valor Bruto</div>
        <div style="font-size: 16px; font-weight: 700; color: #0f172a;">${formatBRL(tx.grossAmount)}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Taxa Aplicada</div>
        <div style="color: #ef4444; font-weight: 600;">- ${formatBRL(tx.fee)}</div>
      </div>
      <div>
        <div style="color: #64748b; font-size: 12px; margin-bottom: 2px;">Valor Líquido</div>
        <div style="font-size: 16px; font-weight: 700; color: #00ba50;">${formatBRL(tx.netAmount)}</div>
      </div>
    </div>
  `;

  modal.classList.add('open');
  refreshIcons();
}

// View Navigation Switcher
// Mask and formatting helpers
function formatCpfCnpj(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
}

function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// Get companies allowed for the current logged-in user (Lineage based)
function getAllowedCompanies() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  if (isAdmin) return currentCompanies;
  const allowedSubtreeIds = getUserSubtreeIds(currentUser.id, currentNetworkUsers);
  return currentCompanies.filter(c => !c.registeredBy || allowedSubtreeIds.includes(c.registeredBy));
}

// Get transactions allowed for the current logged-in user (Lineage based)
function getAllowedTransactions() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  if (isAdmin) return currentTransactions;
  const allowedCompanies = getAllowedCompanies();
  const allowedNames = allowedCompanies.map(c => c.name.toLowerCase());
  return currentTransactions.filter(tx => allowedNames.includes(tx.company.toLowerCase()));
}

// Populate partner / user select options for new company
function populateCompanyPartnerSelect(selectedId = null) {
  const select = document.getElementById('newCompanyRegisteredBy');
  if (!select) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  const allowedIds = isAdmin
    ? currentNetworkUsers.map(u => u.id)
    : getUserSubtreeIds(currentUser.id, currentNetworkUsers);

  const allowedUsers = currentNetworkUsers.filter(u => allowedIds.includes(u.id));

  // Incluir empresas parceiras (vendedoras)
  const partnerCompanies = currentCompanies.filter(c => {
    if (companyIdBeingConfigured && c.id === companyIdBeingConfigured) return false;
    return c.isSeller || (c.status === 'Ativo');
  });

  const targetSelected = selectedId || (isAdmin ? (currentNetworkUsers[0]?.id || 'USR-ADMIN') : currentUser.id);

  let html = `<optgroup label="👑 Administrador e Vendedores da Rede">`;
  allowedUsers.forEach(u => {
    const level = calculateUserLevel(u.id);
    const isSelected = targetSelected === u.id ? 'selected' : '';
    const isMe = u.id === currentUser?.id ? ' (Você)' : '';
    html += `<option value="${u.id}" ${isSelected}>[Nível ${level}] ${u.name}${isMe} - ${u.role}</option>`;
  });
  html += `</optgroup>`;

  if (partnerCompanies.length > 0) {
    html += `<optgroup label="🏢 Empresas Parceiras (Vendedoras / Indicadoras)">`;
    partnerCompanies.forEach(c => {
      const isSelected = targetSelected === c.id ? 'selected' : '';
      const rateDisplay = c.commissionRate !== undefined ? `${c.commissionRate}%` : '0.5%';
      html += `<option value="${c.id}" ${isSelected}>🏢 ${c.name} (${rateDisplay} comissão)</option>`;
    });
    html += `</optgroup>`;
  }

  select.innerHTML = html;
}

// View Navigation Switcher
function switchView(viewName) {
  const viewTransacoes = document.getElementById('view-transacoes');
  const viewEmpresas = document.getElementById('view-empresas');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewComissoes = document.getElementById('view-comissoes');
  const navTransacoes = document.getElementById('nav-transacoes');
  const navEmpresas = document.getElementById('nav-empresas');
  const navDashboard = document.getElementById('nav-dashboard');
  const navComissoes = document.getElementById('nav-comissoes');
  const pageTitle = document.getElementById('pageHeaderTitle');

  const adminCompaniesToggle = document.getElementById('adminCompaniesViewToggle');
  const companiesListContainer = document.getElementById('companiesListContainer');
  const companiesTreeContainer = document.getElementById('companiesTreeContainer');
  const btnEmpresasTabList = document.getElementById('btnEmpresasTabList');
  const btnEmpresasTabTree = document.getElementById('btnEmpresasTabTree');

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  // Persist the current active view across page refreshes
  try {
    localStorage.setItem('konzpay_last_view', viewName);
  } catch (e) {}

  // Reset active classes
  [navTransacoes, navEmpresas, navDashboard, navComissoes].forEach(el => el && el.classList.remove('active'));

  if (viewName === 'empresas') {
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'block';
    if (navEmpresas) navEmpresas.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Pessoas / Empresas';

    // View toggle inside Pessoas/Empresas available for both Admin and Partners
    if (adminCompaniesToggle) adminCompaniesToggle.style.display = 'flex';
    if (btnEmpresasTabTree && btnEmpresasTabTree.classList.contains('active')) {
      if (companiesListContainer) companiesListContainer.style.display = 'none';
      if (companiesTreeContainer) companiesTreeContainer.style.display = 'block';
      renderNetworkView();
    } else {
      if (companiesListContainer) companiesListContainer.style.display = 'block';
      if (companiesTreeContainer) companiesTreeContainer.style.display = 'none';
      filterCompanies();
    }
  } else if (viewName === 'dashboard') {
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (navDashboard) navDashboard.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    updateDashboardStats();
  } else if (viewName === 'comissoes') {
    if (!isAdmin) {
      showToast('Acesso restrito ao Administrador Master.');
      switchView('transacoes');
      return;
    }
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'block';
    if (navComissoes) navComissoes.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Alíquotas de Comissões por Empresa';

    populateRatePartnerSelect();
    filterRates();
    renderRateMetrics();
  } else {
    // Default: transacoes
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'none';
    if (viewTransacoes) viewTransacoes.style.display = 'block';
    if (navTransacoes) navTransacoes.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Transações';

    filteredTransactions = getAllowedTransactions();
    currentPage = 1;
    renderTable();
    updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
  }
  refreshIcons();
}

// Update Dashboard Statistics
function updateDashboardStats() {
  const elEmpresas = document.getElementById('dashValEmpresas');
  const elTransacoes = document.getElementById('dashValTransacoes');
  const elTerminais = document.getElementById('dashValTerminais');
  const elVolume = document.getElementById('dashValVolume');

  const allowedCompanies = getAllowedCompanies();
  const allowedTransactions = getAllowedTransactions();

  const activeCount = allowedCompanies.filter(c => c.status === 'Ativo').length;
  const txCount = allowedTransactions.length;
  const terminalsCount = new Set(allowedTransactions.map(tx => tx.terminal)).size;
  const volumeSum = allowedTransactions.reduce((acc, tx) => acc + (tx.status === 'Aprovada' ? tx.grossAmount : 0), 0);

  if (elEmpresas) elEmpresas.textContent = activeCount;
  if (elTransacoes) elTransacoes.textContent = txCount;
  if (elTerminais) elTerminais.textContent = terminalsCount;
  if (elVolume) elVolume.textContent = formatBRL(volumeSum);
}

// Update Companies Bulk Action UI
function updateCompaniesBulkUI() {
  const bulkBar = document.getElementById('companiesBulkActionBar');
  const countText = document.getElementById('bulkDeleteCountText');
  const checkAll = document.getElementById('checkAllCompanies');

  if (bulkBar && countText) {
    if (selectedCompanyIds.size > 0) {
      bulkBar.style.display = 'inline-flex';
      countText.textContent = `Excluir Selecionadas (${selectedCompanyIds.size})`;
    } else {
      bulkBar.style.display = 'none';
    }
  }

  // Check if all visible companies on current page are selected
  if (checkAll) {
    const startIndex = (companiesCurrentPage - 1) * companiesPerPage;
    const endIndex = Math.min(startIndex + companiesPerPage, filteredCompanies.length);
    const currentSlice = filteredCompanies.slice(startIndex, endIndex);

    if (currentSlice.length > 0 && currentSlice.every(c => selectedCompanyIds.has(c.id))) {
      checkAll.checked = true;
      checkAll.indeterminate = false;
    } else if (currentSlice.some(c => selectedCompanyIds.has(c.id))) {
      checkAll.checked = false;
      checkAll.indeterminate = true;
    } else {
      checkAll.checked = false;
      checkAll.indeterminate = false;
    }
  }
}

// Render Companies Table
function renderCompaniesTable() {
  const tbody = document.getElementById('companiesTableBody');
  const titleEl = document.getElementById('companiesListTitle');
  if (!tbody) return;

  // Sorting
  filteredCompanies.sort((a, b) => {
    let valA = a[companiesSort.column] || '';
    let valB = b[companiesSort.column] || '';

    if (typeof valA === 'string') {
      return companiesSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return companiesSort.order === 'asc' ? valA - valB : valB - valA;
  });

  const totalRecords = filteredCompanies.length;
  const totalPages = Math.ceil(totalRecords / companiesPerPage) || 1;
  if (companiesCurrentPage > totalPages) companiesCurrentPage = totalPages;

  const startIndex = (companiesCurrentPage - 1) * companiesPerPage;
  const endIndex = Math.min(startIndex + companiesPerPage, totalRecords);
  const currentSlice = filteredCompanies.slice(startIndex, endIndex);

  if (titleEl) {
    titleEl.textContent = `Lista de Pessoas/Empresas (${totalRecords})`;
  }

  if (totalRecords === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhum registro encontrado com os filtros pesquisados.
        </td>
      </tr>
    `;
    renderCompaniesPagination(totalPages);
    updateCompaniesBulkUI();
    return;
  }

  tbody.innerHTML = currentSlice.map(comp => {
    const statusBadge = comp.status === 'Ativo'
      ? `<span class="badge-company-active">Ativo</span>`
      : `<span class="badge-company-inactive">Inativo</span>`;

    const isChecked = selectedCompanyIds.has(comp.id) ? 'checked' : '';

    return `
      <tr>
        <td style="text-align: center; width: 44px;">
          <input type="checkbox" class="check-company-item" data-id="${comp.id}" ${isChecked} style="cursor: pointer; width: 16px; height: 16px; accent-color: #1d68d8;">
        </td>
        <td class="cell-company-name"><strong>${comp.name}</strong></td>
        <td class="cell-doc" style="font-family: monospace; font-size: 12px; color: #475569;">${comp.doc || '-'}</td>
        <td class="cell-email">${comp.email}</td>
        <td class="cell-contact">${comp.phone || '-'}</td>
        <td class="cell-created-at">${comp.createdAt}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn-delete-company delete-comp-btn" data-id="${comp.id}" title="Excluir Registro">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderCompaniesPagination(totalPages);
  updateCompaniesBulkUI();
  refreshIcons();

  // Attach individual checkbox events
  tbody.querySelectorAll('.check-company-item').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.getAttribute('data-id');
      if (chk.checked) {
        selectedCompanyIds.add(id);
      } else {
        selectedCompanyIds.delete(id);
      }
      updateCompaniesBulkUI();
    });
  });

  // Attach delete events
  tbody.querySelectorAll('.delete-comp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      deleteCompany(id);
    });
  });
}

// Render Companies Pagination
function renderCompaniesPagination(totalPages) {
  const info = document.getElementById('companiesPaginationInfo');
  const controls = document.getElementById('companiesPaginationControls');
  if (!info || !controls) return;

  info.textContent = `Página ${companiesCurrentPage} de ${totalPages}`;

  let buttonsHtml = `
    <button class="page-btn" id="btnCompPrevPage" ${companiesCurrentPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="page-btn ${i === companiesCurrentPage ? 'active' : ''}" data-comp-page="${i}">
        ${i}
      </button>
    `;
  }

  buttonsHtml += `
    <button class="page-btn" id="btnCompNextPage" ${companiesCurrentPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  controls.innerHTML = buttonsHtml;

  controls.querySelectorAll('.page-btn[data-comp-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      companiesCurrentPage = parseInt(btn.getAttribute('data-comp-page'));
      renderCompaniesTable();
    });
  });

  const prev = document.getElementById('btnCompPrevPage');
  const next = document.getElementById('btnCompNextPage');
  if (prev) {
    prev.addEventListener('click', () => {
      if (companiesCurrentPage > 1) {
        companiesCurrentPage--;
        renderCompaniesTable();
      }
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      if (companiesCurrentPage < totalPages) {
        companiesCurrentPage++;
        renderCompaniesTable();
      }
    });
  }
}

// Delete company
function deleteCompany(id) {
  const comp = currentCompanies.find(c => c.id === id);
  const name = comp ? comp.name : 'Registro';
  if (confirm(`Deseja realmente excluir "${name}"?`)) {
    currentCompanies = currentCompanies.filter(c => c.id !== id);
    filteredCompanies = filteredCompanies.filter(c => c.id !== id);
    saveCompanies(currentCompanies);
    renderCompaniesTable();
    showToast(`"${name}" excluído(a) com sucesso.`);
  }
}

// Filter Companies Handler
function filterCompanies() {
  const term = document.getElementById('inputSearchCompany')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('filterCompanyStatus')?.value || '';
  const order = document.getElementById('filterCompanyOrder')?.value || 'recentes';

  const baseCompanies = getAllowedCompanies();

  filteredCompanies = baseCompanies.filter(comp => {
    if (term) {
      const matchName = (comp.name || '').toLowerCase().includes(term);
      const matchDoc = (comp.doc || '').toLowerCase().includes(term);
      const matchOwner = (comp.owner || '').toLowerCase().includes(term);
      const matchEmail = (comp.email || '').toLowerCase().includes(term);
      const matchPhone = (comp.phone || '').toLowerCase().includes(term);
      if (!matchName && !matchDoc && !matchOwner && !matchEmail && !matchPhone) return false;
    }
    if (status && comp.status !== status) return false;
    return true;
  });

  if (order === 'nome_asc') {
    companiesSort = { column: 'name', order: 'asc' };
  } else if (order === 'nome_desc') {
    companiesSort = { column: 'name', order: 'desc' };
  } else if (order === 'antigos') {
    companiesSort = { column: 'createdAt', order: 'asc' };
  } else {
    companiesSort = { column: 'createdAt', order: 'desc' };
  }

  companiesCurrentPage = 1;
  renderCompaniesTable();
}

// ==========================================================================
// ==========================================================================
// MÓDULO DE DISTRIBUIÇÃO E REPASSE DE COMISSÕES DA REDE (MULTI-NÍVEL & SUB-ÁRVORE)
// ==========================================================================

let calculatedSellerCommissions = [];
let filteredSellerCommissions = [];
let ratesCurrentPage = 1;
const ratesPerPage = 8;
let ratesSort = { column: 'commissionEarned', order: 'desc' };

// Helper to get unified list of sellers/partners for commission calculations
export function getAvailableSellers() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  // Base list: network users
  let list = [...currentNetworkUsers];

  // Include any company that is marked as seller and not already in network users
  currentCompanies.forEach(comp => {
    if (comp.isSeller && !list.some(u => u.id === comp.id)) {
      list.push({
        id: comp.id,
        name: comp.name,
        shortName: comp.name.split(' ')[0],
        email: comp.email,
        role: 'Empresa Parceira / Vendedora',
        parentId: comp.registeredBy,
        commissionRate: comp.commissionRate !== undefined ? comp.commissionRate : 0.5,
        phone: comp.phone,
        doc: comp.doc,
        createdAt: comp.createdAt,
        status: comp.status,
        isCompany: true
      });
    }
  });

  if (isAdmin) {
    return list;
  }

  // Multi-tenant lineage: Sellers only see themselves and their indicated sub-tree
  const allowedIds = getUserSubtreeIds(currentUser.id, list);
  return list.filter(u => allowedIds.includes(u.id));
}

// Compute commission metrics and portfolio for a specific seller
export function computeSellerCommissionData(seller, allCompanies = currentCompanies, allTxs = currentTransactions, networkUsers = currentNetworkUsers) {
  const isMasterAdmin = seller.id === 'USR-ADMIN';

  // 1. Direct and indirect companies in seller's portfolio
  const directCompanies = allCompanies.filter(c => c.registeredBy === seller.id);
  const subTreeCompanies = allCompanies.filter(c => {
    if (c.registeredBy === seller.id) return true;
    const chain = getUplineChain(c.registeredBy, networkUsers, allCompanies);
    return chain.some(node => node.id === seller.id);
  });

  // 2. Transactions for which this seller receives commission
  const subCompanyNames = new Set(subTreeCompanies.map(c => normalizeCompanyName(c.name)));
  const sellerTxs = allTxs.filter(tx => tx.company && subCompanyNames.has(normalizeCompanyName(tx.company)));

  const grossVolume = sellerTxs.reduce((acc, t) => acc + (Number(t.grossAmount) || 0), 0);
  const sellerRate = Number(seller.commissionRate !== undefined ? seller.commissionRate : 0.5);

  // Total commission earned by this seller
  let commissionEarned = 0;
  if (isMasterAdmin) {
    sellerTxs.forEach(t => {
      const spread = Number(t.spread) || (Number(t.grossAmount) * 0.009); // standard fallback spread
      const comp = allCompanies.find(c => normalizeCompanyName(c.name) === normalizeCompanyName(t.company));
      const chain = comp ? getUplineChain(comp.registeredBy, networkUsers, allCompanies) : [];
      const sellersCommissionTotal = chain.reduce((sum, node) => sum + (Number(t.grossAmount) * (node.rate / 100)), 0);
      commissionEarned += Math.max(0, spread - sellersCommissionTotal);
    });
  } else {
    commissionEarned = grossVolume * (sellerRate / 100);
  }

  const level = calculateUserLevel(seller.id, networkUsers);
  const upline = getUplineEntity(seller.parentId);

  return {
    seller,
    level,
    uplineName: upline ? upline.name : '👑 Administrador Master',
    companiesCount: subTreeCompanies.length,
    directCompaniesCount: directCompanies.length,
    grossVolume,
    sellerRate,
    commissionEarned,
    status: seller.status || 'Ativo'
  };
}

// Update calculated seller commissions data cache
function updateSellerCommissionsData() {
  currentTransactions = getStoredTransactions();
  currentCompanies = getStoredCompanies();
  currentNetworkUsers = getStoredNetworkUsers();

  const sellers = getAvailableSellers();
  calculatedSellerCommissions = sellers.map(s => computeSellerCommissionData(s, currentCompanies, currentTransactions, currentNetworkUsers));
  filteredSellerCommissions = [...calculatedSellerCommissions];
}

// Render Rate Top Metrics
function renderRateMetrics() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  updateSellerCommissionsData();

  const totalEarned = calculatedSellerCommissions.reduce((acc, item) => acc + item.commissionEarned, 0);
  const totalVolume = calculatedSellerCommissions.reduce((acc, item) => acc + item.grossVolume, 0);
  const totalSellers = calculatedSellerCommissions.length;
  const ratesSum = calculatedSellerCommissions.reduce((acc, item) => acc + item.sellerRate, 0);
  const avgRate = totalSellers > 0 ? (ratesSum / totalSellers).toFixed(2) : '0.00';

  const elEarned = document.getElementById('commStatTotalEarned');
  const elVolume = document.getElementById('commStatTotalVolume');
  const elSellers = document.getElementById('commStatTotalSellers');
  const elAvg = document.getElementById('commStatAvgRate');

  if (elEarned) elEarned.textContent = formatBRL(totalEarned);
  if (elVolume) elVolume.textContent = formatBRL(totalVolume);
  if (elSellers) elSellers.textContent = totalSellers;
  if (elAvg) elAvg.textContent = `${avgRate}%`;

  const headerTitle = document.getElementById('commissionsViewHeaderTitle');
  const headerSubtitle = document.getElementById('commissionsViewHeaderSubtitle');
  if (headerTitle) {
    headerTitle.textContent = isAdmin 
      ? 'Distribuição e Repasse de Comissões da Rede' 
      : 'Suas Comissões e Indicados';
  }
  if (headerSubtitle) {
    headerSubtitle.textContent = isAdmin
      ? 'Visão completa de todos os vendedores e cálculo das alíquotas distribuídas em cascata.'
      : 'Acompanhe as suas comissões acumuladas e o rendimento da sua carteira de indicados.';
  }
}

// Render Rates Table
function renderRatesTable() {
  const tbody = document.getElementById('ratesTableBody');
  const titleEl = document.getElementById('ratesListTitle');
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  // Sorting
  filteredSellerCommissions.sort((a, b) => {
    let valA = a[ratesSort.column];
    let valB = b[ratesSort.column];

    if (ratesSort.column === 'sellerName') {
      valA = (a.seller.name || '').toLowerCase();
      valB = (b.seller.name || '').toLowerCase();
      return ratesSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return ratesSort.order === 'asc' ? valA - valB : valB - valA;
    }

    valA = (valA || '').toString().toLowerCase();
    valB = (valB || '').toString().toLowerCase();
    return ratesSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const totalRecords = filteredSellerCommissions.length;
  const totalPages = Math.ceil(totalRecords / ratesPerPage) || 1;
  if (ratesCurrentPage > totalPages) ratesCurrentPage = totalPages;

  const startIndex = (ratesCurrentPage - 1) * ratesPerPage;
  const endIndex = Math.min(startIndex + ratesPerPage, totalRecords);
  const currentSlice = filteredSellerCommissions.slice(startIndex, endIndex);

  if (titleEl) {
    titleEl.textContent = isAdmin
      ? `Comissões Distribuídas por Vendedor / Parceiro (${totalRecords})`
      : `Minhas Comissões e Indicados (${totalRecords})`;
  }

  if (totalRecords === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhum vendedor ou comissão encontrada com os filtros pesquisados.
        </td>
      </tr>
    `;
    renderRatesPagination(totalPages);
    return;
  }

  tbody.innerHTML = currentSlice.map(item => {
    const s = item.seller;
    const isSelf = s.id === currentUser?.id;
    const isMaster = s.id === 'USR-ADMIN';
    const initials = s.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const rateFormatted = item.sellerRate.toFixed(2);
    const badgeRole = s.isCompany 
      ? `<span style="display: inline-block; font-size: 10.5px; padding: 2px 6px; background: #e0f2fe; color: #0284c7; border-radius: 4px; font-weight: 700; margin-top: 2px;">🏢 Empresa Parceira</span>`
      : `<span style="font-size: 11px; color: #64748b;">${s.role || 'Consultor'}</span>`;

    const statusBadge = item.status === 'Ativo'
      ? `<span class="badge-company-active">Ativo</span>`
      : `<span class="badge-company-inactive">Inativo</span>`;

    // Apenas Admin Master pode editar alíquotas diretamente na tabela
    const rateControl = isAdmin && !isMaster
      ? `
        <div class="premium-rate-control" data-id="${s.id}">
          <div class="rate-badge-capsule" title="Clique para editar a alíquota deste vendedor">
            <span class="rate-prefix-dot"></span>
            <input type="number" step="0.01" min="0" max="100" class="rate-core-input" data-id="${s.id}" data-original="${rateFormatted}" value="${rateFormatted}">
            <span class="rate-suffix-badge">%</span>
          </div>
          <button type="button" class="btn-rate-save-pulse" data-id="${s.id}" style="display: none;" title="Salvar alteração">
            <i data-lucide="check" style="width: 14px; height: 14px;"></i>
            <span>Salvar</span>
          </button>
        </div>
      `
      : `
        <div style="font-weight: 800; font-size: 13.5px; color: #059669;">
          ${rateFormatted}%
        </div>
      `;

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: #f1f5f9; color: #0f172a; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0;">
              ${initials}
            </div>
            <div>
              <div style="font-weight: 700; color: #0f172a; font-size: 13px;">
                ${s.name} ${isSelf ? '<span style="color: #2563eb; font-size: 11px; font-weight: 700;">(Você)</span>' : ''}
              </div>
              ${badgeRole}
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 600; color: #334155; font-size: 12.5px;">${item.uplineName}</div>
        </td>
        <td style="text-align: center;">
          <span style="font-size: 11.5px; font-weight: 700; background: #f8fafc; border: 1px solid #e2e8f0; padding: 3px 8px; border-radius: 6px; color: #475569;">
            Nível ${item.level}
          </span>
        </td>
        <td style="text-align: center;">
          ${rateControl}
        </td>
        <td style="text-align: right; font-weight: 700; font-size: 13px; color: #0f172a;">
          ${formatBRL(item.grossVolume)}
        </td>
        <td style="text-align: right; font-weight: 800; font-size: 14px; color: #059669;">
          ${formatBRL(item.commissionEarned)}
        </td>
        <td style="text-align: center;">
          <span style="font-weight: 700; color: #3b82f6; font-size: 12.5px;">
            ${item.companiesCount} ${item.companiesCount === 1 ? 'empresa' : 'empresas'}
          </span>
        </td>
        <td style="text-align: center;">
          ${statusBadge}
        </td>
      </tr>
    `;
  }).join('');

  renderRatesPagination(totalPages);
  refreshIcons();

  // Attach dynamic input change & save events
  tbody.querySelectorAll('.rate-core-input').forEach(input => {
    const id = input.getAttribute('data-id');
    const row = input.closest('tr');
    const saveBtn = row?.querySelector(`.btn-rate-save-pulse[data-id="${id}"]`);

    const checkChange = () => {
      const original = parseFloat(input.getAttribute('data-original'));
      const current = parseFloat(input.value);
      if (!isNaN(current) && current !== original) {
        if (saveBtn) {
          saveBtn.style.display = 'inline-flex';
          refreshIcons();
        }
      } else {
        if (saveBtn) saveBtn.style.display = 'none';
      }
    };

    input.addEventListener('input', checkChange);
    input.addEventListener('focus', () => {
      input.select();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0 || val > 100) {
          showToast('Informe uma alíquota válida entre 0% e 100%.');
          return;
        }
        updateSellerCommissionRate(id, val);
        input.setAttribute('data-original', val.toFixed(2));
        if (saveBtn) saveBtn.style.display = 'none';
        input.blur();
      } else if (e.key === 'Escape') {
        input.value = input.getAttribute('data-original');
        if (saveBtn) saveBtn.style.display = 'none';
        input.blur();
      }
    });
  });

  tbody.querySelectorAll('.btn-rate-save-pulse').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const input = tbody.querySelector(`.rate-core-input[data-id="${id}"]`);
      if (input) {
        const val = parseFloat(input.value);
        if (isNaN(val) || val < 0 || val > 100) {
          showToast('Informe uma alíquota válida entre 0% e 100%.');
          return;
        }
        updateSellerCommissionRate(id, val);
        input.setAttribute('data-original', val.toFixed(2));
        btn.style.display = 'none';
      }
    });
  });
}

// Render Rates Pagination
function renderRatesPagination(totalPages) {
  const info = document.getElementById('ratesPaginationInfo');
  const controls = document.getElementById('ratesPaginationControls');
  if (!info || !controls) return;

  info.textContent = `Página ${ratesCurrentPage} de ${totalPages}`;

  let buttonsHtml = `
    <button class="page-btn" id="btnRatePrevPage" ${ratesCurrentPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="page-btn ${i === ratesCurrentPage ? 'active' : ''}" data-rate-page="${i}">
        ${i}
      </button>
    `;
  }

  buttonsHtml += `
    <button class="page-btn" id="btnRateNextPage" ${ratesCurrentPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  controls.innerHTML = buttonsHtml;

  controls.querySelectorAll('.page-btn[data-rate-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      ratesCurrentPage = parseInt(btn.getAttribute('data-rate-page'));
      renderRatesTable();
    });
  });

  const prev = document.getElementById('btnRatePrevPage');
  const next = document.getElementById('btnRateNextPage');
  if (prev) {
    prev.addEventListener('click', () => {
      if (ratesCurrentPage > 1) {
        ratesCurrentPage--;
        renderRatesTable();
      }
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      if (ratesCurrentPage < totalPages) {
        ratesCurrentPage++;
        renderRatesTable();
      }
    });
  }
}

// Filter Rates Handler
function filterRates() {
  const term = document.getElementById('inputSearchRateCompany')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('filterRateStatus')?.value || '';
  const order = document.getElementById('filterRateOrder')?.value || 'maior_comissao';

  updateSellerCommissionsData();

  filteredSellerCommissions = calculatedSellerCommissions.filter(item => {
    if (term) {
      const matchName = (item.seller.name || '').toLowerCase().includes(term);
      const matchEmail = (item.seller.email || '').toLowerCase().includes(term);
      const matchDoc = (item.seller.doc || '').toLowerCase().includes(term);
      const matchRole = (item.seller.role || '').toLowerCase().includes(term);
      if (!matchName && !matchEmail && !matchDoc && !matchRole) return false;
    }
    if (status && item.status !== status) return false;
    return true;
  });

  if (order === 'maior_comissao') {
    ratesSort = { column: 'commissionEarned', order: 'desc' };
  } else if (order === 'maior_volume') {
    ratesSort = { column: 'grossVolume', order: 'desc' };
  } else if (order === 'maior_aliquota') {
    ratesSort = { column: 'sellerRate', order: 'desc' };
  } else if (order === 'menor_aliquota') {
    ratesSort = { column: 'sellerRate', order: 'asc' };
  } else if (order === 'nome_asc') {
    ratesSort = { column: 'sellerName', order: 'asc' };
  }

  ratesCurrentPage = 1;
  renderRatesTable();
  renderRateMetrics();
}

// Update single seller commission rate
function updateSellerCommissionRate(sellerId, newRate) {
  const rate = parseFloat(parseFloat(newRate).toFixed(2));

  // 1. Atualizar na rede
  const user = currentNetworkUsers.find(u => u.id === sellerId);
  if (user) {
    user.commissionRate = rate;
    saveNetworkUsers(currentNetworkUsers);
  }

  // 2. Atualizar em empresas se for empresa vendedora
  const comp = currentCompanies.find(c => c.id === sellerId);
  if (comp) {
    comp.commissionRate = rate;
    saveCompanies(currentCompanies);
  }

  renderRatesTable();
  renderRateMetrics();
  renderNetworkView();
  showToast(`Alíquota de "${user ? user.name : (comp ? comp.name : 'Vendedor')}" atualizada para ${rate.toFixed(2)}%!`);
}

// Open Edit Rate Modal
function openEditRateModal(sellerId) {
  const seller = currentNetworkUsers.find(u => u.id === sellerId) || currentCompanies.find(c => c.id === sellerId);
  if (!seller) return;

  const modal = document.getElementById('editRateModal');
  const idInput = document.getElementById('editRateCompanyId');
  const nameEl = document.getElementById('editRateCompanyName');
  const docEl = document.getElementById('editRateCompanyDoc');
  const rateInput = document.getElementById('editRateInput');

  if (idInput) idInput.value = seller.id;
  if (nameEl) nameEl.textContent = seller.name;
  if (docEl) docEl.textContent = seller.doc || '-';
  if (rateInput) rateInput.value = (seller.commissionRate !== undefined ? Number(seller.commissionRate) : 0.5).toFixed(2);

  modal?.classList.add('open');
}

// ==========================================================================
// REDE HIERÁRQUICA E ÁRVORE GENEALÓGICA DE USUÁRIOS
// ==========================================================================

// Calculate user level in hierarchy tree
function calculateUserLevel(userId, users = currentNetworkUsers) {
  let level = 0;
  let current = users.find(u => u.id === userId);
  while (current && current.parentId) {
    level++;
    current = users.find(u => u.id === current.parentId);
  }
  return level;
}

// Get direct children of a user
function getUserDirectChildren(userId, users = currentNetworkUsers) {
  return users.filter(u => u.parentId === userId);
}

// Render complete Network view (metrics, tree, table, and selects)
function renderNetworkView() {
  currentNetworkUsers = getStoredNetworkUsers();
  renderNetworkMetrics();
  renderNetworkTree();
  renderNetworkTable();
  populateUplineSelect();
  resetTreeZoom();
}

// Render network metrics
function renderNetworkMetrics() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  const statTotal = document.getElementById('statTotalNetworkUsers');
  const statDirect = document.getElementById('statDirectUsers');
  const statDepth = document.getElementById('statTreeDepth');
  const statAvg = document.getElementById('statAvgCommission');

  const visibleUserIds = isAdmin 
    ? currentNetworkUsers.map(u => u.id)
    : getUserSubtreeIds(currentUser.id, currentNetworkUsers);

  const visibleUsers = currentNetworkUsers.filter(u => visibleUserIds.includes(u.id));

  if (statTotal) statTotal.textContent = visibleUsers.length;
  
  const rootId = isAdmin ? 'USR-ADMIN' : currentUser.id;
  const directUsers = getUserDirectChildren(rootId);
  if (statDirect) statDirect.textContent = directUsers.length;

  let maxDepth = 0;
  let sumCommission = 0;
  visibleUsers.forEach(u => {
    const lvl = calculateUserLevel(u.id);
    if (lvl > maxDepth) maxDepth = lvl;
    sumCommission += Number(u.commissionRate || 0);
  });

  if (statDepth) {
    const userLvl = isAdmin ? 0 : calculateUserLevel(currentUser.id);
    const depthCount = maxDepth - userLvl + 1;
    statDepth.textContent = `${Math.max(1, depthCount)} Níveis`;
  }
  if (statAvg && visibleUsers.length > 0) {
    statAvg.textContent = `${(sumCommission / visibleUsers.length).toFixed(1)}%`;
  }
}

// Tree Zoom & Pan State
let treeZoomLevel = 1.0;
let treePanX = 0;
let treePanY = 0;
let isTreeDragging = false;
let treeDragStartX = 0;
let treeDragStartY = 0;
let treeInitialPanX = 0;
let treeInitialPanY = 0;

function updateTreeTransform(animated = false) {
  const wrapper = document.getElementById('networkTreeWrapper');
  const text = document.getElementById('treeZoomPercentText');
  if (!wrapper) return;
  wrapper.style.transition = animated ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)' : 'none';
  wrapper.style.transform = `translate(${treePanX}px, ${treePanY}px) scale(${treeZoomLevel})`;
  if (text) text.textContent = `${Math.round(treeZoomLevel * 100)}%`;
}

function setTreeZoom(newZoom, animated = true) {
  treeZoomLevel = Math.min(2.0, Math.max(0.35, Math.round(newZoom * 100) / 100));
  updateTreeTransform(animated);
}

function resetTreeZoom() {
  treeZoomLevel = 1.0;
  treePanX = 0;
  treePanY = 0;
  updateTreeTransform(true);
}

function fitTreeToView() {
  const viewport = document.getElementById('treeViewport');
  const wrapper = document.getElementById('networkTreeWrapper');
  if (!viewport || !wrapper) return;

  const vpW = viewport.clientWidth || 800;
  const vpH = viewport.clientHeight || 560;
  const contentW = wrapper.scrollWidth || 900;
  const contentH = wrapper.scrollHeight || 500;

  const scaleX = (vpW - 60) / contentW;
  const scaleY = (vpH - 60) / contentH;
  treeZoomLevel = Math.min(1.0, Math.max(0.4, Math.min(scaleX, scaleY)));
  treePanX = 0;
  treePanY = 0;
  updateTreeTransform(true);
}

function setupTreePanAndZoom() {
  const viewport = document.getElementById('treeViewport');
  const btnIn = document.getElementById('btnTreeZoomIn');
  const btnOut = document.getElementById('btnTreeZoomOut');
  const btnReset = document.getElementById('btnTreeZoomReset');
  const btnFit = document.getElementById('btnTreeZoomFit');

  if (btnIn) btnIn.addEventListener('click', () => setTreeZoom(treeZoomLevel + 0.15));
  if (btnOut) btnOut.addEventListener('click', () => setTreeZoom(treeZoomLevel - 0.15));
  if (btnReset) btnReset.addEventListener('click', resetTreeZoom);
  if (btnFit) btnFit.addEventListener('click', fitTreeToView);

  if (!viewport) return;

  // Mouse wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
    setTreeZoom(treeZoomLevel * zoomFactor, false);
  }, { passive: false });

  // Mouse drag to pan
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('.btn-add-subnode') || e.target.closest('input')) {
      return;
    }
    isTreeDragging = true;
    treeDragStartX = e.clientX;
    treeDragStartY = e.clientY;
    treeInitialPanX = treePanX;
    treeInitialPanY = treePanY;
    viewport.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isTreeDragging) return;
    treePanX = treeInitialPanX + (e.clientX - treeDragStartX);
    treePanY = treeInitialPanY + (e.clientY - treeDragStartY);
    updateTreeTransform(false);
  });

  window.addEventListener('mouseup', () => {
    if (isTreeDragging) {
      isTreeDragging = false;
      viewport?.classList.remove('is-dragging');
    }
  });
}

// Render visual hierarchy tree (Recursive)
function renderNetworkTree() {
  const container = document.getElementById('networkTreeWrapper');
  if (!container) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  const root = isAdmin
    ? (currentNetworkUsers.find(u => !u.parentId || u.id === 'USR-ADMIN') || currentNetworkUsers[0])
    : currentNetworkUsers.find(u => u.id === currentUser.id);

  if (!root) {
    container.innerHTML = '<p style="color: #64748b; padding: 20px;">Nenhum usuário cadastrado na sua rede.</p>';
    return;
  }

  const rootLevel = isAdmin ? 0 : calculateUserLevel(currentUser.id);

  function buildNodeHTML(user) {
    const isRoot = !user.parentId || user.id === 'USR-ADMIN' || (!isAdmin && user.id === currentUser.id);
    const level = calculateUserLevel(user.id);
    const displayLevel = Math.max(0, level - rootLevel);
    const children = getUserDirectChildren(user.id);
    const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const isSelf = user.id === currentUser?.id;

    let html = `
      <div class="tree-branch ${children.length > 0 ? 'has-children' : ''}">
        <div class="tree-node ${isRoot ? 'is-root' : ''}" data-user-id="${user.id}">
          <div class="tree-node-header">
            <div class="tree-node-avatar">${initials}</div>
            <div class="tree-node-title-group">
              <span class="tree-node-name" title="${user.name}">
                ${user.name} ${isSelf ? '<span style="color:#059669; font-size:11px; font-weight:700;">(Você)</span>' : ''}
              </span>
              <span class="tree-node-role">${user.role || 'Membro'}</span>
            </div>
          </div>
          <div class="tree-node-badges">
            <span class="badge-level">Nível ${displayLevel}</span>
            <span class="badge-commission">${user.commissionRate}% Comiss.</span>
          </div>
          <div class="tree-node-footer">
            <span class="tree-downlines-count">
              <i data-lucide="users" style="width: 12px; height: 12px;"></i>
              ${children.length} ${children.length === 1 ? 'indicado' : 'indicados'}
            </span>
            <button type="button" class="btn-add-subnode" data-parent-id="${user.id}" title="Cadastrar usuário abaixo de ${user.name}">
              <i data-lucide="plus" style="width: 11px; height: 11px;"></i>
              <span>+ Indicar</span>
            </button>
          </div>
        </div>
    `;

    if (children.length > 0) {
      html += `<div class="tree-children">`;
      children.forEach(child => {
        html += buildNodeHTML(child);
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  container.innerHTML = `
    <svg id="treeSvgOverlay"></svg>
    <div style="position: relative; z-index: 2; display: flex; justify-content: center;">
      ${buildNodeHTML(root)}
    </div>
  `;

  // Attach quick add buttons
  container.querySelectorAll('.btn-add-subnode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentId = btn.getAttribute('data-parent-id');
      openNewNetworkUserModal(parentId);
    });
  });

  refreshIcons();

  // Draw clean aligned connectors
  requestAnimationFrame(() => {
    drawTreeConnectors();
    setTimeout(drawTreeConnectors, 60);
  });
}

// Draw mathematically aligned SVG connectors between parent and children nodes
function drawTreeConnectors() {
  const wrapper = document.getElementById('networkTreeWrapper');
  const svg = document.getElementById('treeSvgOverlay');
  if (!wrapper || !svg) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const width = Math.max(wrapper.scrollWidth, wrapper.clientWidth, wrapperRect.width);
  const height = Math.max(wrapper.scrollHeight, wrapper.clientHeight, wrapperRect.height);

  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  let paths = '';

  const parentBranches = wrapper.querySelectorAll('.tree-branch');
  parentBranches.forEach(branch => {
    const parentNode = branch.querySelector(':scope > .tree-node');
    const childrenContainer = branch.querySelector(':scope > .tree-children');
    if (!parentNode || !childrenContainer) return;

    const childBranches = childrenContainer.querySelectorAll(':scope > .tree-branch');
    if (childBranches.length === 0) return;

    const pRect = parentNode.getBoundingClientRect();
    const parentX = Math.round(pRect.left + pRect.width / 2 - wrapperRect.left);
    const parentY = Math.round(pRect.bottom - wrapperRect.top);

    const childPoints = [];
    childBranches.forEach(cb => {
      const cNode = cb.querySelector(':scope > .tree-node');
      if (cNode) {
        const cRect = cNode.getBoundingClientRect();
        childPoints.push({
          x: Math.round(cRect.left + cRect.width / 2 - wrapperRect.left),
          y: Math.round(cRect.top - wrapperRect.top)
        });
      }
    });

    if (childPoints.length === 0) return;

    if (childPoints.length === 1) {
      const c = childPoints[0];
      if (Math.abs(parentX - c.x) < 4) {
        paths += `<line x1="${parentX}" y1="${parentY}" x2="${c.x}" y2="${c.y}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />`;
      } else {
        const midY = Math.round(parentY + (c.y - parentY) / 2);
        paths += `<path d="M ${parentX} ${parentY} V ${midY} H ${c.x} V ${c.y}" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linejoin="round" stroke-linecap="round" />`;
      }
    } else {
      const firstChildX = Math.min(...childPoints.map(p => p.x));
      const lastChildX = Math.max(...childPoints.map(p => p.x));
      const firstChildY = childPoints[0].y;
      const midY = Math.round(parentY + (firstChildY - parentY) / 2);

      // 1. Linha vertical reta do centro inferior do pai até o barramento
      paths += `<line x1="${parentX}" y1="${parentY}" x2="${parentX}" y2="${midY}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />`;

      // 2. Barramento horizontal conectando exatamente do centro do 1º filho ao centro do último
      paths += `<line x1="${firstChildX}" y1="${midY}" x2="${lastChildX}" y2="${midY}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />`;

      // 3. Linhas verticais retas descendo do barramento para o topo de cada filho
      childPoints.forEach(c => {
        paths += `<line x1="${c.x}" y1="${midY}" x2="${c.x}" y2="${c.y}" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" />`;
      });
    }
  });

  svg.innerHTML = paths;
}

// Render network data table
function renderNetworkTable() {
  const tbody = document.getElementById('networkTableBody');
  if (!tbody) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  const visibleIds = isAdmin 
    ? currentNetworkUsers.map(u => u.id)
    : getUserSubtreeIds(currentUser.id, currentNetworkUsers);

  const displayUsers = filteredNetworkUsers.filter(u => visibleIds.includes(u.id));

  if (displayUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">
          Nenhum membro encontrado na sua rede.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = displayUsers.map(u => {
    const isRoot = !u.parentId || u.id === 'USR-ADMIN' || (!isAdmin && u.id === currentUser.id);
    const level = calculateUserLevel(u.id);
    const uplineUser = currentNetworkUsers.find(parent => parent.id === u.parentId);
    const uplineName = uplineUser ? uplineUser.name : '👑 Raiz (Admin Master)';
    const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    const isSelf = u.id === currentUser?.id;

    return `
      <tr>
        <td>
          <div class="table-network-user">
            <div class="user-avatar-sm" style="${isRoot ? 'background: #fef3c7; color: #d97706;' : ''}">${initials}</div>
            <div class="user-name-col">
              <span class="user-full-name">${u.name} ${isSelf ? '<span style="color:#059669; font-size:11px; font-weight:700;">(Você)</span>' : ''}</span>
              <span class="user-id-sub">${u.id}</span>
            </div>
          </div>
        </td>
        <td>
          <span style="font-size: 13px; color: #475569; font-weight: 500;">${u.email}</span>
        </td>
        <td>
          <span class="upline-badge">
            <i data-lucide="arrow-up-right" style="width: 13px; height: 13px; color: #64748b;"></i>
            <span>${uplineName}</span>
          </span>
        </td>
        <td>
          <span class="badge-level">Nível ${level}</span>
        </td>
        <td>
          <span style="font-weight: 600; color: #0f172a; font-size: 12.5px;">${u.role || 'Membro'}</span>
        </td>
        <td>
          <span class="badge-commission">${u.commissionRate}%</span>
        </td>
        <td>
          <span class="${u.status === 'Ativo' ? 'badge-company-active' : 'badge-company-inactive'}">
            ${u.status || 'Ativo'}
          </span>
        </td>
        <td style="text-align: right;">
          ${(!isRoot && u.id !== currentUser?.id) ? `
            <button type="button" class="btn-delete-company btn-delete-user" data-user-id="${u.id}" title="Excluir Usuário da Rede">
              <i data-lucide="trash-2"></i>
            </button>
          ` : '<span style="font-size: 12px; color: #94a3b8; font-weight: 600;">Principal</span>'}
        </td>
      </tr>
    `;
  }).join('');

  // Attach delete buttons
  tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-user-id');
      deleteNetworkUser(id);
    });
  });

  refreshIcons();
}

// Populate upline select options
function populateUplineSelect(selectedId = null) {
  const select = document.getElementById('newUserParentId');
  if (!select) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;

  const allowedIds = isAdmin
    ? currentNetworkUsers.map(u => u.id)
    : getUserSubtreeIds(currentUser.id, currentNetworkUsers);

  const allowedUsers = currentNetworkUsers.filter(u => allowedIds.includes(u.id));

  // Default target is either preselected or currentUser.id
  const targetSelected = selectedId || (isAdmin ? (currentNetworkUsers[0]?.id || 'USR-ADMIN') : currentUser.id);

  select.innerHTML = allowedUsers.map(u => {
    const level = calculateUserLevel(u.id);
    const isSelected = targetSelected === u.id ? 'selected' : '';
    const isMe = u.id === currentUser?.id ? ' (Você)' : '';
    return `<option value="${u.id}" ${isSelected}>[Nível ${level}] ${u.name}${isMe} - ${u.role}</option>`;
  }).join('');
}

// Modal open / close handlers
function openNewNetworkUserModal(preselectedParentId = null) {
  const modal = document.getElementById('newNetworkUserModal');
  if (!modal) return;
  populateUplineSelect(preselectedParentId);
  modal.classList.add('open');
  refreshIcons();
}

function closeNewNetworkUserModal() {
  const modal = document.getElementById('newNetworkUserModal');
  if (modal) modal.classList.remove('open');
}

// Delete user from network
function deleteNetworkUser(userId) {
  const user = currentNetworkUsers.find(u => u.id === userId);
  if (!user) return;

  const hasChildren = currentNetworkUsers.some(u => u.parentId === userId);
  if (hasChildren) {
    if (!confirm(`O usuário ${user.name} possui indicados abaixo dele na árvore. Se você excluí-lo, os indicados passarão para o superior direto dele. Deseja continuar?`)) {
      return;
    }
    // Re-link children to grandparent
    currentNetworkUsers.forEach(u => {
      if (u.parentId === userId) {
        u.parentId = user.parentId || 'USR-ADMIN';
      }
    });
  } else {
    if (!confirm(`Deseja realmente remover ${user.name} da rede de parceiros?`)) {
      return;
    }
  }

  currentNetworkUsers = currentNetworkUsers.filter(u => u.id !== userId);
  filteredNetworkUsers = [...currentNetworkUsers];
  saveNetworkUsers(currentNetworkUsers);
  renderNetworkView();
  showToast(`Usuário ${user.name} removido da rede.`);
}

// Setup Event Listeners
function setupEvents() {
  // Sidebar View Switchers
  const navDashboard = document.getElementById('nav-dashboard');
  const navEmpresas = document.getElementById('nav-empresas');
  const navTransacoes = document.getElementById('nav-transacoes');
  const navRede = document.getElementById('nav-rede');

  if (navDashboard) {
    navDashboard.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('dashboard');
    });
  }

  if (navEmpresas) {
    navEmpresas.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('empresas');
    });
  }

  if (navTransacoes) {
    navTransacoes.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('transacoes');
    });
  }

  const navComissoes = document.getElementById('nav-comissoes');
  if (navComissoes) {
    navComissoes.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('comissoes');
    });
  }

  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Rates Filter Form & Actions (Gestão de Alíquotas)
  const ratesFilterForm = document.getElementById('ratesFilterForm');
  if (ratesFilterForm) {
    ratesFilterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterRates();
    });
  }

  const btnClearRatesFilters = document.getElementById('btnClearRatesFilters');
  if (btnClearRatesFilters) {
    btnClearRatesFilters.addEventListener('click', () => {
      const inputSearch = document.getElementById('inputSearchRateCompany');
      const selectStatus = document.getElementById('filterRateStatus');
      const selectPartner = document.getElementById('filterRatePartner');
      const selectRange = document.getElementById('filterRateRange');
      const selectOrder = document.getElementById('filterRateOrder');

      if (inputSearch) inputSearch.value = '';
      if (selectStatus) selectStatus.value = '';
      if (selectPartner) selectPartner.value = '';
      if (selectRange) selectRange.value = '';
      if (selectOrder) selectOrder.value = 'recentes';
      filterRates();
    });
  }

  const inputSearchRateCompany = document.getElementById('inputSearchRateCompany');
  if (inputSearchRateCompany) {
    inputSearchRateCompany.addEventListener('input', () => {
      filterRates();
    });
  }

  document.getElementById('filterRateStatus')?.addEventListener('change', filterRates);
  document.getElementById('filterRatePartner')?.addEventListener('change', filterRates);
  document.getElementById('filterRateOrder')?.addEventListener('change', filterRates);

  // Modal: Edit Single Rate
  const editRateModal = document.getElementById('editRateModal');
  const btnCloseEditRateModal = document.getElementById('btnCloseEditRateModal');
  const btnCancelEditRate = document.getElementById('btnCancelEditRate');
  const editRateForm = document.getElementById('editRateForm');

  const closeEditRateModal = () => editRateModal?.classList.remove('open');
  if (btnCloseEditRateModal) btnCloseEditRateModal.addEventListener('click', closeEditRateModal);
  if (btnCancelEditRate) btnCancelEditRate.addEventListener('click', closeEditRateModal);

  if (editRateForm) {
    editRateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sellerId = document.getElementById('editRateCompanyId').value;
      const rateVal = parseFloat(document.getElementById('editRateInput').value);
      if (isNaN(rateVal) || rateVal < 0 || rateVal > 100) {
        showToast('Informe uma alíquota válida entre 0% e 100%.');
        return;
      }
      updateSellerCommissionRate(sellerId, rateVal);
      closeEditRateModal();
    });
  }

  // Filter Form Submit (Transações)
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empresa = document.getElementById('filterEmpresas')?.value;
      const metodo = document.getElementById('filterFormaPagamento')?.value;
      const parcelas = document.getElementById('filterParcelas')?.value;
      const bandeira = document.getElementById('filterBandeira')?.value;
      const status = document.getElementById('filterStatus')?.value;
      const dataInicio = document.getElementById('filterDataInicio')?.value.trim();
      const dataTermino = document.getElementById('filterDataTermino')?.value.trim();

      filteredTransactions = currentTransactions.filter(tx => {
        if (empresa && tx.company !== empresa) return false;
        if (metodo && !tx.method.includes(metodo)) return false;
        if (parcelas && tx.installments && !tx.installments.includes(parcelas)) return false;
        if (bandeira && tx.brand !== bandeira) return false;
        if (status && tx.status !== status) return false;
        if (dataInicio && tx.date && tx.date < dataInicio) return false;
        if (dataTermino && tx.date && tx.date > dataTermino) return false;
        return true;
      });

      currentPage = 1;
      renderTable();
      updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
      showToast(`Filtros aplicados! ${filteredTransactions.length} transações encontradas.`);
    });
  }

  // Clear Filters (Transações)
  const btnClearFilters = document.getElementById('btnClearFilters');
  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      filterForm.reset();
      filteredTransactions = [...currentTransactions];
      currentPage = 1;
      renderTable();
      updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
      syncAllCustomSelects();
      showToast('Filtros de transação limpos.');
    });
  }

  // Search Input (Transações)
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        filteredTransactions = [...currentTransactions];
      } else {
        filteredTransactions = currentTransactions.filter(tx => {
          return (
            tx.id.toLowerCase().includes(term) ||
            tx.company.toLowerCase().includes(term) ||
            (tx.partner && tx.partner.toLowerCase().includes(term)) ||
            tx.terminal.toLowerCase().includes(term) ||
            tx.brand.toLowerCase().includes(term) ||
            tx.status.toLowerCase().includes(term)
          );
        });
      }
      currentPage = 1;
      renderTable();
    });
  }

  // Rows Per Page Selector (10, 50, 100, Todas)
  const selectRowsPerPage = document.getElementById('selectRowsPerPage');
  if (selectRowsPerPage) {
    selectRowsPerPage.value = recordsPerPage === Infinity ? 'all' : recordsPerPage.toString();
    selectRowsPerPage.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === 'all') {
        recordsPerPage = Infinity;
      } else {
        recordsPerPage = parseInt(val) || 10;
      }
      try { localStorage.setItem('konzpay_rows_per_page', val); } catch (err) {}
      currentPage = 1;
      renderTable();
    });
  }

  // Check All Transactions Handler
  const checkAllTransactions = document.getElementById('checkAllTransactions');
  if (checkAllTransactions) {
    checkAllTransactions.addEventListener('change', () => {
      const isAllRows = recordsPerPage === Infinity;
      const totalRecords = filteredTransactions.length;
      const startIndex = isAllRows ? 0 : (currentPage - 1) * recordsPerPage;
      const endIndex = isAllRows ? totalRecords : Math.min(startIndex + recordsPerPage, totalRecords);
      const currentSlice = filteredTransactions.slice(startIndex, endIndex);

      if (checkAllTransactions.checked) {
        currentSlice.forEach(t => selectedTransactionIds.add(t.id));
      } else {
        currentSlice.forEach(t => selectedTransactionIds.delete(t.id));
      }
      renderTable();
    });
  }

  // Bulk Delete Transactions Button
  const btnDeleteSelectedTransactions = document.getElementById('btnDeleteSelectedTransactions');
  if (btnDeleteSelectedTransactions) {
    btnDeleteSelectedTransactions.addEventListener('click', () => {
      if (selectedTransactionIds.size === 0) return;
      const count = selectedTransactionIds.size;
      openDeleteConfirmModal({
        title: 'Excluir Transações Selecionadas',
        message: `Tem certeza que deseja excluir <strong>${count} transação(ões)</strong> selecionada(s)? Esta ação é definitiva e atualizará todas as métricas da rede.`,
        onConfirm: () => {
          currentTransactions = currentTransactions.filter(t => !selectedTransactionIds.has(t.id));
          filteredTransactions = filteredTransactions.filter(t => !selectedTransactionIds.has(t.id));
          saveTransactions(currentTransactions);
          selectedTransactionIds.clear();
          renderTable();
          updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
          updateDashboardStats();
          refreshTransactionFiltersOptions(currentTransactions);
          renderRatesTable();
          renderRateMetrics();
          showToast(`${count} transação(ões) excluída(s) com sucesso.`);
        }
      });
    });
  }

  // Clear Transaction Selection
  const btnClearTransactionSelection = document.getElementById('btnClearTransactionSelection');
  if (btnClearTransactionSelection) {
    btnClearTransactionSelection.addEventListener('click', () => {
      selectedTransactionIds.clear();
      renderTable();
    });
  }

  // Modal: Delete Confirm
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const btnCancelDeleteConfirm = document.getElementById('btnCancelDeleteConfirm');
  const btnExecuteDeleteConfirm = document.getElementById('btnExecuteDeleteConfirm');

  if (btnCancelDeleteConfirm) {
    btnCancelDeleteConfirm.addEventListener('click', closeDeleteConfirmModal);
  }

  if (btnExecuteDeleteConfirm) {
    btnExecuteDeleteConfirm.addEventListener('click', () => {
      if (typeof pendingDeleteCallback === 'function') {
        const cb = pendingDeleteCallback;
        pendingDeleteCallback = null;
        cb();
      }
      closeDeleteConfirmModal();
    });
  }

  // Companies Search & Filters
  const companiesFilterForm = document.getElementById('companiesFilterForm');
  if (companiesFilterForm) {
    companiesFilterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterCompanies();
      showToast(`Pesquisa de empresas realizada! ${filteredCompanies.length} encontradas.`);
    });
  }

  const inputSearchCompany = document.getElementById('inputSearchCompany');
  if (inputSearchCompany) {
    inputSearchCompany.addEventListener('input', () => {
      filterCompanies();
    });
  }

  const filterCompanyStatus = document.getElementById('filterCompanyStatus');
  if (filterCompanyStatus) filterCompanyStatus.addEventListener('change', filterCompanies);

  const filterCompanyOrder = document.getElementById('filterCompanyOrder');
  if (filterCompanyOrder) filterCompanyOrder.addEventListener('change', filterCompanies);

  // Bulk Delete Companies Handlers
  const checkAllCompanies = document.getElementById('checkAllCompanies');
  if (checkAllCompanies) {
    checkAllCompanies.addEventListener('change', () => {
      const startIndex = (companiesCurrentPage - 1) * companiesPerPage;
      const endIndex = Math.min(startIndex + companiesPerPage, filteredCompanies.length);
      const currentSlice = filteredCompanies.slice(startIndex, endIndex);

      if (checkAllCompanies.checked) {
        currentSlice.forEach(c => selectedCompanyIds.add(c.id));
      } else {
        currentSlice.forEach(c => selectedCompanyIds.delete(c.id));
      }
      renderCompaniesTable();
    });
  }

  const btnDeleteSelectedCompanies = document.getElementById('btnDeleteSelectedCompanies');
  if (btnDeleteSelectedCompanies) {
    btnDeleteSelectedCompanies.addEventListener('click', () => {
      if (selectedCompanyIds.size === 0) return;
      const count = selectedCompanyIds.size;
      openDeleteConfirmModal({
        title: 'Excluir Pessoas/Empresas Selecionadas',
        message: `Tem certeza que deseja excluir <strong>${count} pessoa(s)/empresa(s)</strong> selecionada(s)? Esta ação é definitiva.`,
        onConfirm: () => {
          currentCompanies = currentCompanies.filter(c => !selectedCompanyIds.has(c.id));
          filteredCompanies = filteredCompanies.filter(c => !selectedCompanyIds.has(c.id));
          saveCompanies(currentCompanies);
          selectedCompanyIds.clear();
          renderCompaniesTable();
          showToast(`${count} empresa(s) excluída(s) com sucesso.`);
        }
      });
    });
  }

  const btnClearCompanySelection = document.getElementById('btnClearCompanySelection');
  if (btnClearCompanySelection) {
    btnClearCompanySelection.addEventListener('click', () => {
      selectedCompanyIds.clear();
      renderCompaniesTable();
    });
  }

  // Modal: Nova Pessoa/Empresa
  const newCompanyModal = document.getElementById('newCompanyModal');
  const btnOpenNewCompanyModal = document.getElementById('btnOpenNewCompanyModal');
  const btnCloseNewCompanyModal = document.getElementById('btnCloseNewCompanyModal');
  const btnCancelNewCompany = document.getElementById('btnCancelNewCompany');
  const newCompanyForm = document.getElementById('newCompanyForm');
  const inputNewCompDoc = document.getElementById('newCompanyDoc');
  const inputNewCompPhone = document.getElementById('newCompanyPhone');

  // Máscaras de entrada para CPF/CNPJ e Telefone
  if (inputNewCompDoc) {
    inputNewCompDoc.addEventListener('input', (e) => {
      e.target.value = formatCpfCnpj(e.target.value);
    });
  }

  if (inputNewCompPhone) {
    inputNewCompPhone.addEventListener('input', (e) => {
      e.target.value = formatPhone(e.target.value);
    });
  }

  const closeNewCompanyModal = () => {
    companyIdBeingConfigured = null;
    newCompanyModal?.classList.remove('open');
  };

  const openNewCompanyModal = () => {
    companyIdBeingConfigured = null;
    const title = newCompanyModal?.querySelector('.modal-title');
    if (title) title.textContent = 'Cadastrar Nova Pessoa/Empresa';
    newCompanyForm?.reset();
    const inputRate = document.getElementById('newCompanyCommissionRate');
    if (inputRate) inputRate.value = '0.50';
    const inputSeller = document.getElementById('newCompanyIsSeller');
    if (inputSeller) inputSeller.checked = false;
    populateCompanyPartnerSelect();
    newCompanyModal?.classList.add('open');
  };

  window.openNewCompanyModalForCompletion = function(comp) {
    companyIdBeingConfigured = comp.id;
    const title = newCompanyModal?.querySelector('.modal-title');
    if (title) title.innerHTML = `✨ Configurar Nova Empresa: <span style="color: #059669;">${comp.name}</span>`;

    const inputName = document.getElementById('newCompanyName');
    const inputDoc = document.getElementById('newCompanyDoc');
    const inputPhone = document.getElementById('newCompanyPhone');
    const inputEmail = document.getElementById('newCompanyEmail');
    const inputRate = document.getElementById('newCompanyCommissionRate');
    const inputSeller = document.getElementById('newCompanyIsSeller');
    const selectStatus = document.getElementById('newCompanyStatus');

    if (inputName) inputName.value = comp.name;
    if (inputDoc) inputDoc.value = comp.doc && comp.doc !== '-' ? comp.doc : '';
    if (inputPhone) inputPhone.value = comp.phone && comp.phone !== '( ) 9999-9999' ? comp.phone : '';
    if (inputEmail) inputEmail.value = comp.email || '';
    if (inputRate) inputRate.value = (comp.commissionRate !== undefined ? comp.commissionRate : 0.50).toFixed(2);
    if (inputSeller) inputSeller.checked = Boolean(comp.isSeller);
    if (selectStatus) selectStatus.value = comp.status || 'Ativo';

    populateCompanyPartnerSelect(comp.registeredBy || 'USR-ADMIN');
    newCompanyModal?.classList.add('open');
  };

  if (btnOpenNewCompanyModal) {
    btnOpenNewCompanyModal.addEventListener('click', openNewCompanyModal);
  }

  if (btnCloseNewCompanyModal) btnCloseNewCompanyModal.addEventListener('click', closeNewCompanyModal);
  if (btnCancelNewCompany) btnCancelNewCompany.addEventListener('click', closeNewCompanyModal);

  if (newCompanyForm) {
    newCompanyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentUser = getCurrentUser();
      const name = document.getElementById('newCompanyName').value.trim();
      const doc = document.getElementById('newCompanyDoc').value.trim();
      const phone = document.getElementById('newCompanyPhone').value.trim();
      const email = document.getElementById('newCompanyEmail').value.trim();
      const registeredBy = document.getElementById('newCompanyRegisteredBy')?.value || (currentUser?.id || 'USR-ADMIN');
      const commissionRate = parseFloat(document.getElementById('newCompanyCommissionRate')?.value) || 0.50;
      const isSeller = Boolean(document.getElementById('newCompanyIsSeller')?.checked);
      const status = document.getElementById('newCompanyStatus').value || 'Ativo';

      const upline = getUplineEntity(registeredBy);
      const partnerName = upline ? upline.name : 'Francisco Pereira Paulo';

      let targetComp = null;
      if (companyIdBeingConfigured) {
        targetComp = currentCompanies.find(c => c.id === companyIdBeingConfigured);
      }

      if (targetComp) {
        targetComp.name = name.toUpperCase();
        targetComp.doc = doc || '-';
        targetComp.owner = name.split(' ')[0].toUpperCase();
        targetComp.email = email.toLowerCase();
        targetComp.phone = phone || '( ) 9999-9999';
        targetComp.registeredBy = registeredBy;
        targetComp.partnerName = partnerName;
        targetComp.commissionRate = commissionRate;
        targetComp.isSeller = isSeller;
        targetComp.status = status;
      } else {
        targetComp = {
          id: `EMP-${Date.now().toString().slice(-4)}`,
          name: name.toUpperCase(),
          doc: doc || '-',
          owner: name.split(' ')[0].toUpperCase(),
          email: email.toLowerCase(),
          phone: phone || '( ) 9999-9999',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          status: status,
          registeredBy: registeredBy,
          partnerName: partnerName,
          commissionRate: commissionRate,
          isSeller: isSeller
        };
        currentCompanies.unshift(targetComp);
      }

      // Se a empresa também atua como vendedora na rede, adicionar/atualizar na rede
      if (isSeller) {
        let userNode = currentNetworkUsers.find(u => u.id === targetComp.id);
        if (!userNode) {
          userNode = {
            id: targetComp.id,
            name: targetComp.name,
            shortName: targetComp.name.split(' ')[0],
            email: targetComp.email,
            role: 'Empresa Parceira / Vendedora',
            parentId: targetComp.registeredBy,
            commissionRate: targetComp.commissionRate,
            phone: targetComp.phone,
            doc: targetComp.doc,
            createdAt: targetComp.createdAt,
            status: targetComp.status,
            isCompany: true
          };
          currentNetworkUsers.push(userNode);
        } else {
          userNode.name = targetComp.name;
          userNode.parentId = targetComp.registeredBy;
          userNode.commissionRate = targetComp.commissionRate;
          userNode.status = targetComp.status;
        }
        saveNetworkUsers(currentNetworkUsers);
      }

      // Atualizar transações vinculadas a esta empresa
      currentTransactions.forEach(tx => {
        if (tx.company && tx.company.toUpperCase() === targetComp.name.toUpperCase()) {
          tx.partner = partnerName;
        }
      });
      filteredTransactions = [...currentTransactions];

      saveCompanies(currentCompanies);
      saveTransactions(currentTransactions);
      refreshTransactionFiltersOptions(currentTransactions);

      companyIdBeingConfigured = null;
      newCompanyForm.reset();
      closeNewCompanyModal();

      renderTable();
      renderRatesTable();
      filterCompanies();
      renderNetworkView();
      updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
      updateDashboardStats();

      showToast(`🎉 "${targetComp.name}" configurada com sucesso! Vendedor: "${partnerName}" | Comissão: ${targetComp.commissionRate}%`);
    });
  }

  // Admin Empresas Tabs Toggle (Lista de Empresas vs Árvore Genealógica da Rede)
  const btnEmpresasTabList = document.getElementById('btnEmpresasTabList');
  const btnEmpresasTabTree = document.getElementById('btnEmpresasTabTree');
  const companiesListContainer = document.getElementById('companiesListContainer');
  const companiesTreeContainer = document.getElementById('companiesTreeContainer');

  if (btnEmpresasTabList && btnEmpresasTabTree) {
    btnEmpresasTabList.addEventListener('click', () => {
      btnEmpresasTabList.classList.add('active');
      btnEmpresasTabTree.classList.remove('active');
      try { localStorage.setItem('konzpay_last_empresas_tab', 'list'); } catch (e) {}
      if (companiesListContainer) companiesListContainer.style.display = 'block';
      if (companiesTreeContainer) companiesTreeContainer.style.display = 'none';
      filterCompanies();
    });

    btnEmpresasTabTree.addEventListener('click', () => {
      btnEmpresasTabTree.classList.add('active');
      btnEmpresasTabList.classList.remove('active');
      try { localStorage.setItem('konzpay_last_empresas_tab', 'tree'); } catch (e) {}
      if (companiesListContainer) companiesListContainer.style.display = 'none';
      if (companiesTreeContainer) companiesTreeContainer.style.display = 'block';
      renderNetworkView();
    });
  }

  // Network View Mode Toggle (Tree vs Table)
  const btnModeTree = document.getElementById('btnModeTree');
  const btnModeTable = document.getElementById('btnModeTable');
  const treeViewContainer = document.getElementById('treeViewContainer');
  const networkTableViewContainer = document.getElementById('networkTableViewContainer');

  if (btnModeTree && btnModeTable) {
    btnModeTree.addEventListener('click', () => {
      btnModeTree.classList.add('active');
      btnModeTable.classList.remove('active');
      try { localStorage.setItem('konzpay_last_network_mode', 'tree'); } catch (e) {}
      if (treeViewContainer) treeViewContainer.style.display = 'block';
      if (networkTableViewContainer) networkTableViewContainer.style.display = 'none';
      currentNetworkViewMode = 'tree';
    });

    btnModeTable.addEventListener('click', () => {
      btnModeTable.classList.add('active');
      btnModeTree.classList.remove('active');
      try { localStorage.setItem('konzpay_last_network_mode', 'table'); } catch (e) {}
      if (treeViewContainer) treeViewContainer.style.display = 'none';
      if (networkTableViewContainer) networkTableViewContainer.style.display = 'block';
      currentNetworkViewMode = 'table';
      renderNetworkTable();
    });
  }

  // Network User Search
  const networkUserSearchInput = document.getElementById('networkUserSearchInput');
  if (networkUserSearchInput) {
    networkUserSearchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      if (!term) {
        filteredNetworkUsers = [...currentNetworkUsers];
      } else {
        filteredNetworkUsers = currentNetworkUsers.filter(u => {
          const upline = currentNetworkUsers.find(p => p.id === u.parentId);
          const uplineName = upline ? upline.name.toLowerCase() : 'admin raiz';
          return (
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            u.id.toLowerCase().includes(term) ||
            u.role.toLowerCase().includes(term) ||
            uplineName.includes(term)
          );
        });
      }
      renderNetworkTable();
    });
  }

  // Modal: Novo Usuário na Rede
  const btnOpenNewUserModal = document.getElementById('btnOpenNewUserModal');
  const btnCloseNewUserModal = document.getElementById('btnCloseNewUserModal');
  const btnCancelNewUser = document.getElementById('btnCancelNewUser');
  const newNetworkUserForm = document.getElementById('newNetworkUserForm');

  if (btnOpenNewUserModal) btnOpenNewUserModal.addEventListener('click', () => openNewNetworkUserModal());
  if (btnCloseNewUserModal) btnCloseNewUserModal.addEventListener('click', closeNewNetworkUserModal);
  if (btnCancelNewUser) btnCancelNewUser.addEventListener('click', closeNewNetworkUserModal);

  if (newNetworkUserForm) {
    newNetworkUserForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const currentUser = getCurrentUser();
      const isAdmin = currentUser?.isAdmin ?? true;
      const parentId = document.getElementById('newUserParentId').value;
      const name = document.getElementById('newUserName').value.trim();
      const email = document.getElementById('newUserEmail').value.trim();
      const password = document.getElementById('newUserPassword').value.trim();
      const role = document.getElementById('newUserRole').value;
      const commissionRate = parseFloat(document.getElementById('newUserCommission').value) || 5.0;
      const phone = document.getElementById('newUserPhone').value.trim() || '(41) 99999-0000';
      const status = document.getElementById('newUserStatus').value || 'Ativo';

      // 1. Check if parentId is within the allowed lineage
      if (!canUserRegisterUnder(currentUser.id, parentId, currentNetworkUsers, isAdmin)) {
        showToast('Você só pode cadastrar indicados dentro da sua própria linhagem/rede.', 'success');
        return;
      }

      // 2. Check commission limit (cannot exceed current user's commission if not admin)
      if (!isAdmin && commissionRate > Number(currentUser.commissionRate || 100)) {
        showToast(`A comissão informada (${commissionRate}%) não pode ultrapassar a sua comissão máxima (${currentUser.commissionRate}%).`, 'success');
        return;
      }

      // 3. Check if email already exists
      if (currentNetworkUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showToast('Já existe um usuário cadastrado com este email.', 'success');
        return;
      }

      const nextNum = (currentNetworkUsers.length + 1).toString().padStart(3, '0');
      const newUser = {
        id: `USR-${nextNum}`,
        name,
        email,
        password,
        role,
        parentId,
        commissionRate,
        phone,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        status
      };

      currentNetworkUsers.push(newUser);
      filteredNetworkUsers = [...currentNetworkUsers];
      saveNetworkUsers(currentNetworkUsers);

      newNetworkUserForm.reset();
      document.getElementById('newUserPassword').value = '123456';
      document.getElementById('newUserCommission').value = '5.0';

      closeNewNetworkUserModal();
      renderNetworkView();
      showToast(`Usuário ${name} cadastrado com sucesso na sua rede!`);
    });
  }

  // Sort Table Columns (Geral)
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      const table = th.closest('table');

      if (table.id === 'companiesTable') {
        if (companiesSort.column === col) {
          companiesSort.order = companiesSort.order === 'asc' ? 'desc' : 'asc';
        } else {
          companiesSort.column = col;
          companiesSort.order = 'asc';
        }
        renderCompaniesTable();
      } else {
        if (currentSort.column === col) {
          currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.column = col;
          currentSort.order = 'asc';
        }
        renderTable();
      }
    });
  });

  // Modal: Gerar Relatório
  const reportModal = document.getElementById('reportModal');
  const btnOpenReportModal = document.getElementById('btnOpenReportModal');
  const btnCloseReportModal = document.getElementById('btnCloseReportModal');
  const btnCancelReport = document.getElementById('btnCancelReport');
  const btnConfirmReport = document.getElementById('btnConfirmReport');

  const closeReportModal = () => reportModal?.classList.remove('open');

  if (btnOpenReportModal) btnOpenReportModal.addEventListener('click', () => reportModal?.classList.add('open'));
  if (btnCloseReportModal) btnCloseReportModal.addEventListener('click', closeReportModal);
  if (btnCancelReport) btnCancelReport.addEventListener('click', closeReportModal);

  if (btnConfirmReport) {
    btnConfirmReport.addEventListener('click', () => {
      const format = document.getElementById('reportFormat').value.toUpperCase();
      closeReportModal();
      showToast(`Relatório exportado em formato ${format} com sucesso!`);
    });
  }

  // Modal: Detalhes
  const detailsModal = document.getElementById('detailsModal');
  const btnCloseDetailsModal = document.getElementById('btnCloseDetailsModal');
  const btnCloseDetailsBtn = document.getElementById('btnCloseDetailsBtn');

  const closeDetailsModal = () => detailsModal?.classList.remove('open');
  if (btnCloseDetailsModal) btnCloseDetailsModal.addEventListener('click', closeDetailsModal);
  if (btnCloseDetailsBtn) btnCloseDetailsBtn.addEventListener('click', closeDetailsModal);

  // Modal: Importação Inteligente com Gemini AI
  const geminiImportModal = document.getElementById('geminiImportModal');
  const btnOpenGeminiImportModal = document.getElementById('btnOpenGeminiImportModal');
  const btnCloseGeminiModal = document.getElementById('btnCloseGeminiModal');
  const btnCancelGeminiModal = document.getElementById('btnCancelGeminiModal');
  const geminiApiKeyInput = document.getElementById('geminiApiKeyInput');
  const btnSaveGeminiKey = document.getElementById('btnSaveGeminiKey');
  const geminiDropzone = document.getElementById('geminiDropzone');
  const geminiFileInput = document.getElementById('geminiFileInput');
  const geminiSelectedFileInfo = document.getElementById('geminiSelectedFileInfo');
  const geminiSelectedFileName = document.getElementById('geminiSelectedFileName');
  const geminiSelectedFileSize = document.getElementById('geminiSelectedFileSize');
  const btnRemoveSelectedFile = document.getElementById('btnRemoveSelectedFile');
  const geminiLoadingBox = document.getElementById('geminiLoadingBox');
  const geminiProgressText = document.getElementById('geminiProgressText');
  const geminiPreviewContainer = document.getElementById('geminiPreviewContainer');
  const btnStartGeminiProcess = document.getElementById('btnStartGeminiProcess');
  const btnConfirmGeminiImport = document.getElementById('btnConfirmGeminiImport');

  let selectedGeminiFile = null;
  let extractedGeminiData = null;

  const closeGeminiModal = () => {
    geminiImportModal?.classList.remove('open');
    resetGeminiModalState();
  };

  const resetGeminiModalState = () => {
    selectedGeminiFile = null;
    extractedGeminiData = null;
    if (geminiFileInput) geminiFileInput.value = '';
    if (geminiDropzone) geminiDropzone.style.display = 'block';
    if (geminiSelectedFileInfo) geminiSelectedFileInfo.style.display = 'none';
    if (geminiLoadingBox) geminiLoadingBox.style.display = 'none';
    if (geminiPreviewContainer) geminiPreviewContainer.style.display = 'none';
    if (btnStartGeminiProcess) {
      btnStartGeminiProcess.style.display = 'inline-flex';
      btnStartGeminiProcess.disabled = false;
    }
    if (btnConfirmGeminiImport) btnConfirmGeminiImport.style.display = 'none';
  };

  const handleFileSelection = (file) => {
    if (!file) return;
    selectedGeminiFile = file;
    if (geminiSelectedFileName) geminiSelectedFileName.textContent = file.name;
    if (geminiSelectedFileSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      geminiSelectedFileSize.textContent = `(${sizeMB} MB)`;
    }
    if (geminiDropzone) geminiDropzone.style.display = 'none';
    if (geminiSelectedFileInfo) geminiSelectedFileInfo.style.display = 'flex';
    refreshIcons();
  };

  if (btnOpenGeminiImportModal) {
    btnOpenGeminiImportModal.addEventListener('click', () => {
      resetGeminiModalState();
      if (geminiApiKeyInput) {
        geminiApiKeyInput.value = getStoredGeminiKey();
      }
      geminiImportModal?.classList.add('open');
      refreshIcons();
    });
  }

  if (btnCloseGeminiModal) btnCloseGeminiModal.addEventListener('click', closeGeminiModal);
  if (btnCancelGeminiModal) btnCancelGeminiModal.addEventListener('click', closeGeminiModal);

  if (btnSaveGeminiKey) {
    btnSaveGeminiKey.addEventListener('click', () => {
      const key = geminiApiKeyInput?.value.trim();
      saveGeminiKey(key);
      showToast('Chave de API do Gemini salva com sucesso!');
    });
  }

  if (geminiDropzone && geminiFileInput) {
    geminiDropzone.addEventListener('click', () => geminiFileInput.click());

    geminiDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      geminiDropzone.style.borderColor = '#d97706';
      geminiDropzone.style.backgroundColor = '#fffbeb';
    });

    geminiDropzone.addEventListener('dragleave', () => {
      geminiDropzone.style.borderColor = '#cbd5e1';
      geminiDropzone.style.backgroundColor = '#ffffff';
    });

    geminiDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      geminiDropzone.style.borderColor = '#cbd5e1';
      geminiDropzone.style.backgroundColor = '#ffffff';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    geminiFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  if (btnRemoveSelectedFile) {
    btnRemoveSelectedFile.addEventListener('click', resetGeminiModalState);
  }

  const geminiProgressTitle = document.getElementById('geminiProgressTitle');
  const geminiProgressBar = document.getElementById('geminiProgressBar');
  const geminiProgressStepBadge = document.getElementById('geminiProgressStepBadge');
  const geminiProgressTimer = document.getElementById('geminiProgressTimer');
  let geminiTimerInterval = null;

  // Start Gemini AI Extraction
  if (btnStartGeminiProcess) {
    btnStartGeminiProcess.addEventListener('click', async () => {
      if (!selectedGeminiFile) {
        showToast('Por favor, selecione um arquivo (PDF, imagem ou CSV) primeiro.', 'success');
        return;
      }

      const apiKey = geminiApiKeyInput?.value.trim() || getStoredGeminiKey();
      if (!apiKey) {
        showToast('Por favor, insira sua chave da API do Google AI Studio.', 'success');
        geminiApiKeyInput?.focus();
        return;
      }
      saveGeminiKey(apiKey);

      try {
        if (geminiSelectedFileInfo) geminiSelectedFileInfo.style.display = 'none';
        if (geminiLoadingBox) geminiLoadingBox.style.display = 'block';
        if (btnStartGeminiProcess) btnStartGeminiProcess.disabled = true;

        // Iniciar cronômetro em tempo real
        const startTime = Date.now();
        if (geminiProgressTimer) geminiProgressTimer.textContent = '0.0s';
        if (geminiProgressBar) geminiProgressBar.style.width = '10%';
        if (geminiProgressStepBadge) geminiProgressStepBadge.textContent = 'Etapa 1/3';
        if (geminiProgressTitle) geminiProgressTitle.textContent = 'Lendo Documento...';
        if (geminiProgressText) geminiProgressText.textContent = 'Preparando arquivo para análise com Gemini 3.5 Flash...';

        if (geminiTimerInterval) clearInterval(geminiTimerInterval);
        geminiTimerInterval = setInterval(() => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          if (geminiProgressTimer) geminiProgressTimer.textContent = `${elapsed}s`;
        }, 100);

        const result = await extractTransactionsWithGemini(
          selectedGeminiFile,
          apiKey,
          (prog) => {
            if (prog.title && geminiProgressTitle) geminiProgressTitle.textContent = prog.title;
            if (prog.message && geminiProgressText) geminiProgressText.textContent = prog.message;
            if (prog.percent && geminiProgressBar) geminiProgressBar.style.width = `${prog.percent}%`;
            if (prog.step && geminiProgressStepBadge) {
              geminiProgressStepBadge.textContent = `Etapa ${prog.step}/${prog.stepTotal || 3}`;
            }
          }
        );

        if (geminiTimerInterval) {
          clearInterval(geminiTimerInterval);
          geminiTimerInterval = null;
        }

        extractedGeminiData = result;

        if (geminiLoadingBox) geminiLoadingBox.style.display = 'none';
        if (geminiPreviewContainer) geminiPreviewContainer.style.display = 'block';

        // Update preview KPIs
        const prevCompany = document.getElementById('prevCompany');
        const prevCount = document.getElementById('prevCount');
        const prevGross = document.getElementById('prevGross');

        const totalGross = result.transactions.reduce((acc, t) => acc + t.grossAmount, 0);

        if (prevCompany) {
          prevCompany.textContent = result.company;
          prevCompany.title = result.company;
        }
        if (prevCount) prevCount.textContent = `${result.transactions.length} transações`;
        if (prevGross) prevGross.textContent = formatBRL(totalGross);

        // Render preview table rows
        const tbody = document.getElementById('geminiPreviewTableBody');
        if (tbody) {
          tbody.innerHTML = result.transactions.map(t => `
            <tr>
              <td><strong>${t.date}</strong> ${t.time}</td>
              <td style="font-family: monospace;">${t.terminal}</td>
              <td>${t.method} (${t.brand})</td>
              <td><span class="badge-company-active" style="padding: 2px 6px; font-size: 11px;">${t.status}</span></td>
              <td style="font-weight: 700;">${formatBRL(t.grossAmount)}</td>
              <td style="color: #059669; font-weight: 700;">${formatBRL(t.clientPaid !== null && t.clientPaid !== undefined ? t.clientPaid : t.netAmount)}</td>
            </tr>
          `).join('');
        }

        if (btnStartGeminiProcess) btnStartGeminiProcess.style.display = 'none';
        if (btnConfirmGeminiImport) btnConfirmGeminiImport.style.display = 'inline-flex';
        showToast(`Gemini extraiu ${result.transactions.length} transações com sucesso!`);
      } catch (error) {
        if (geminiTimerInterval) {
          clearInterval(geminiTimerInterval);
          geminiTimerInterval = null;
        }
        console.error('Erro na extração do Gemini:', error);
        if (geminiLoadingBox) geminiLoadingBox.style.display = 'none';
        if (geminiSelectedFileInfo) geminiSelectedFileInfo.style.display = 'flex';
        if (btnStartGeminiProcess) btnStartGeminiProcess.disabled = false;
        alert(`Erro ao processar com Gemini AI:\n${error.message}`);
      }
    });
  }

  // Confirm Import & Save
  if (btnConfirmGeminiImport) {
    btnConfirmGeminiImport.addEventListener('click', () => {
      if (!extractedGeminiData || !extractedGeminiData.transactions.length) return;

      const rawExtractedName = (extractedGeminiData.company || 'Empresa Sem Nome').trim();
      const existingComp = findCompanyMatch(rawExtractedName, currentCompanies);

      const newTxs = extractedGeminiData.transactions;
      // Garantir ordenação da mais recente para a mais antiga
      newTxs.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));

      if (existingComp) {
        // 1. Empresa JÁ cadastrada: associar automaticamente com as configurações e vendedor existentes
        newTxs.forEach(t => {
          t.company = existingComp.name;
          t.partner = existingComp.partnerName || getUplineEntity(existingComp.registeredBy).name || 'Francisco Pereira Paulo';
        });

        // Injetar e ordenar todas as transações da mais recente para a mais antiga
        currentTransactions = [...newTxs, ...currentTransactions];
        currentTransactions.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));
        filteredTransactions = [...currentTransactions];

        currentSort = { column: 'date', order: 'desc' };
        saveTransactions(currentTransactions);
        refreshTransactionFiltersOptions(currentTransactions);

        currentPage = 1;
        renderTable();
        renderRatesTable();
        updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
        updateDashboardStats();
        closeGeminiModal();

        showToast(`🎉 ${newTxs.length} transações de "${existingComp.name}" importadas e associadas ao vendedor "${existingComp.partnerName || 'Francisco'}" (${existingComp.commissionRate || 0.5}% comissão)!`);
      } else {
        // 2. Empresa NOVA (não cadastrada): criar pré-cadastro e abrir formulário para o Administrador completar
        const newCompId = `EMP-${Date.now().toString().slice(-4)}`;
        const preComp = {
          id: newCompId,
          name: rawExtractedName.toUpperCase(),
          doc: '',
          owner: rawExtractedName.split(' ')[0].toUpperCase(),
          email: 'contato@' + rawExtractedName.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com.br',
          phone: '',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          status: 'Ativo',
          registeredBy: 'USR-ADMIN',
          partnerName: 'Francisco Pereira Paulo',
          commissionRate: 0.50,
          isSeller: false
        };

        currentCompanies.unshift(preComp);
        saveCompanies(currentCompanies);
        filterCompanies();

        newTxs.forEach(t => {
          t.company = preComp.name;
          t.partner = preComp.partnerName;
        });

        // Injetar e ordenar todas as transações da mais recente para a mais antiga
        currentTransactions = [...newTxs, ...currentTransactions];
        currentTransactions.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));
        filteredTransactions = [...currentTransactions];

        currentSort = { column: 'date', order: 'desc' };
        saveTransactions(currentTransactions);
        refreshTransactionFiltersOptions(currentTransactions);

        currentPage = 1;
        renderTable();
        renderRatesTable();
        updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
        updateDashboardStats();
        closeGeminiModal();

        // Abrir formulário para complementar dados da nova empresa e definir vendedor/comissão
        setTimeout(() => {
          if (typeof window.openNewCompanyModalForCompletion === 'function') {
            window.openNewCompanyModalForCompletion(preComp);
          }
        }, 300);

        showToast(`✨ Nova Empresa Detectada! Complete o cadastro para definir o vendedor indicador e comissão de "${preComp.name}".`);
      }
    });
  }

  // Close modals on backdrop click
  const newNetworkUserModal = document.getElementById('newNetworkUserModal');
  window.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
    if (e.target === detailsModal) closeDetailsModal();
    if (e.target === newCompanyModal) closeNewCompanyModal();
    if (e.target === newNetworkUserModal) closeNewNetworkUserModal();
    if (e.target === editRateModal) closeEditRateModal();
    if (e.target === geminiImportModal) closeGeminiModal();
    if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
  });

  // Dashboard Action Links
  document.getElementById('dashLinkEmpresas')?.addEventListener('click', () => switchView('empresas'));
  document.getElementById('dashLinkTransacoes')?.addEventListener('click', () => switchView('transacoes'));
  document.getElementById('dashLinkTerminais')?.addEventListener('click', () => switchView('transacoes'));
  document.getElementById('dashLinkVolume')?.addEventListener('click', () => switchView('transacoes'));

  // Dashboard Refresh Button
  const btnRefreshDashboard = document.getElementById('btnRefreshDashboard');
  if (btnRefreshDashboard) {
    btnRefreshDashboard.addEventListener('click', () => {
      btnRefreshDashboard.classList.add('spinning');
      setTimeout(() => {
        btnRefreshDashboard.classList.remove('spinning');
        updateDashboardStats();
        showToast('Dashboard atualizado com sucesso!');
      }, 500);
    });
  }

  // Logout button handler
  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    logout();
    checkAuthState();
    showToast('Sessão encerrada com sucesso.');
  });

  // Redraw SVG connectors on window resize
  window.addEventListener('resize', () => {
    if (document.getElementById('companiesTreeContainer')?.style.display !== 'none') {
      drawTreeConnectors();
    }
  });

  // Setup Pan & Zoom for the interactive network tree
  setupTreePanAndZoom();
}

// Authentication State Controller
function checkAuthState() {
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserRole = document.getElementById('headerUserRole');
  const navComissoes = document.getElementById('nav-comissoes');

  if (isAuthenticated()) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    const user = getCurrentUser();
    if (headerUserName && user) {
      headerUserName.textContent = user.shortName || user.name || 'Francisco';
    }
    if (headerUserRole && user) {
      headerUserRole.textContent = user.role || 'Membro da Rede';
      headerUserRole.style.color = user.isAdmin ? '#059669' : '#1d68d8';
    }

    // Comissões menu item is strictly visible ONLY for Admin Master
    if (navComissoes && navComissoes.parentElement) {
      if (user?.isAdmin) {
        navComissoes.parentElement.style.display = 'block';
      } else {
        navComissoes.parentElement.style.display = 'none';
      }
    }

    refreshIcons();
    return true;
  } else {
    if (appContainer) appContainer.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'flex';
    refreshIcons();
    return false;
  }
}

// Setup Authentication Event Listeners
function setupAuthEvents() {
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginRemember = document.getElementById('loginRemember');
  const loginErrorBox = document.getElementById('loginErrorBox');
  const loginErrorMessage = document.getElementById('loginErrorMessage');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const togglePasswordIcon = document.getElementById('togglePasswordIcon');
  const btnForgotPwd = document.getElementById('btnForgotPwd');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');

  // Toggle Password Visibility
  if (btnTogglePassword && loginPassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      if (togglePasswordIcon) {
        togglePasswordIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
        refreshIcons();
      }
    });
  }

  // Forgot Password Action
  if (btnForgotPwd) {
    btnForgotPwd.addEventListener('click', (e) => {
      e.preventDefault();
      showToast(`Email de admin: ${ADMIN_CREDENTIALS.email}`);
    });
  }

  // Login Submit Handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim();
      const password = loginPassword.value.trim();
      const remember = loginRemember?.checked || false;

      if (btnLoginSubmit) {
        btnLoginSubmit.classList.add('loading');
        btnLoginSubmit.innerHTML = '<span>Verificando...</span>';
      }

      setTimeout(async () => {
        const result = login(email, password, remember);

        if (result.success) {
          if (loginErrorBox) loginErrorBox.classList.remove('show');
          loginPassword.value = '';
          checkAuthState();
          await loadInitialData();
          showToast(`Bem-vindo, ${result.user.shortName}! Acesso total de Administrador liberado.`);
        } else {
          if (loginErrorBox && loginErrorMessage) {
            loginErrorMessage.textContent = result.message;
            loginErrorBox.classList.add('show');
          }
          loginPassword.focus();
        }

        if (btnLoginSubmit) {
          btnLoginSubmit.classList.remove('loading');
          btnLoginSubmit.innerHTML = '<span>Acessar Painel</span><i data-lucide="arrow-right"></i>';
          refreshIcons();
        }
      }, 400);
    });
  }
}

// Update Supabase UI Status Indicator
function updateSupabaseStatus() {
  const dot = document.getElementById('supabaseStatusDot');
  const text = document.getElementById('supabaseStatusText');
  const client = getSupabaseClient();

  if (dot && text) {
    if (client) {
      dot.style.backgroundColor = '#00ba50';
      dot.style.boxShadow = '0 0 6px rgba(0, 186, 80, 0.6)';
      text.textContent = 'Supabase Conectado';
      text.style.color = '#059669';
      text.style.fontWeight = '600';
    } else {
      dot.style.backgroundColor = '#94a3b8';
      dot.style.boxShadow = 'none';
      text.textContent = 'Conectar Supabase';
      text.style.color = '#64748b';
      text.style.fontWeight = '500';
    }
  }
}

// Load Initial Data (from Supabase or LocalStorage real data)
async function loadInitialData() {
  updateSupabaseStatus();

  const remoteTransactions = await fetchTransactionsFromSupabase();
  if (remoteTransactions && remoteTransactions.length > 0) {
    remoteTransactions.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));
    currentTransactions = remoteTransactions;
    filteredTransactions = [...remoteTransactions];
    saveTransactions(currentTransactions);
  } else {
    const stored = getStoredTransactions();
    stored.sort((a, b) => parseTxDateTime(b.date, b.time) - parseTxDateTime(a.date, a.time));
    currentTransactions = stored;
    filteredTransactions = [...stored];
  }

  currentPage = 1;
  currentCompanies = getStoredCompanies();
  filteredCompanies = [...currentCompanies];
  currentCommissions = getStoredCommissions();
  filteredCommissions = [...currentCommissions];
  currentNetworkUsers = getStoredNetworkUsers();
  filteredNetworkUsers = [...currentNetworkUsers];

  renderTable();
  renderCompaniesTable();
  updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
  refreshTransactionFiltersOptions(currentTransactions);

  // Restore the last active view and sub-tab state when the page reloads / restarts
  try {
    const savedView = localStorage.getItem('konzpay_last_view') || 'transacoes';
    const savedEmpresasTab = localStorage.getItem('konzpay_last_empresas_tab') || 'list';
    const savedNetworkMode = localStorage.getItem('konzpay_last_network_mode') || 'tree';

    // Restore empresas sub-tab (Lista vs Árvore)
    const btnEmpresasTabList = document.getElementById('btnEmpresasTabList');
    const btnEmpresasTabTree = document.getElementById('btnEmpresasTabTree');
    if (savedEmpresasTab === 'tree') {
      btnEmpresasTabList?.classList.remove('active');
      btnEmpresasTabTree?.classList.add('active');
    } else {
      btnEmpresasTabList?.classList.add('active');
      btnEmpresasTabTree?.classList.remove('active');
    }

    // Restore network sub-mode (Árvore Visual vs Tabela Detalhada)
    const btnModeTree = document.getElementById('btnModeTree');
    const btnModeTable = document.getElementById('btnModeTable');
    const treeViewContainer = document.getElementById('treeViewContainer');
    const networkTableViewContainer = document.getElementById('networkTableViewContainer');

    if (savedNetworkMode === 'table') {
      btnModeTree?.classList.remove('active');
      btnModeTable?.classList.add('active');
      if (treeViewContainer) treeViewContainer.style.display = 'none';
      if (networkTableViewContainer) networkTableViewContainer.style.display = 'block';
      currentNetworkViewMode = 'table';
    } else {
      btnModeTree?.classList.add('active');
      btnModeTable?.classList.remove('active');
      if (treeViewContainer) treeViewContainer.style.display = 'block';
      if (networkTableViewContainer) networkTableViewContainer.style.display = 'none';
      currentNetworkViewMode = 'tree';
    }

    switchView(savedView);
  } catch (e) {
    switchView('transacoes');
  }
}

// Initial Boot
document.addEventListener('DOMContentLoaded', async () => {
  initFilters();
  setupEvents();
  setupAuthEvents();
  const isAuth = checkAuthState();
  if (isAuth) {
    await loadInitialData();
  }
  refreshIcons();
});
