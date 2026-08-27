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

// Application State - Transações
let currentTransactions = [...MOCK_TRANSACTIONS];
let filteredTransactions = [...MOCK_TRANSACTIONS];
let currentPage = 1;
const recordsPerPage = 10;
let currentSort = { column: 'date', order: 'desc' };

// Application State - Empresas
let currentCompanies = [...MOCK_COMPANIES_DATA];
let filteredCompanies = [...MOCK_COMPANIES_DATA];
let companiesCurrentPage = 1;
const companiesPerPage = 8;
let companiesSort = { column: 'createdAt', order: 'desc' };
let selectedCompanyIds = new Set();

// Application State - Comissões
let currentCommissions = [...MOCK_COMMISSIONS_DATA];
let filteredCommissions = [...MOCK_COMMISSIONS_DATA];
let commissionsCurrentPage = 1;
const commissionsPerPage = 8;
let commissionsSort = { column: 'date', order: 'desc' };

// Application State - Rede Hierárquica
let currentNetworkUsers = getStoredNetworkUsers();
let filteredNetworkUsers = [...currentNetworkUsers];
let currentNetworkViewMode = 'tree'; // 'tree' ou 'table'

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
}

// Initialize all filters dropdowns
function initFilters() {
  populateSelect('filterEmpresas', MOCK_COMPANIES);
  populateSelect('filterParceiro', MOCK_PARTNERS);
  populateSelect('filterTerminal', MOCK_TERMINALS);
  populateSelect('filterFormaPagamento', MOCK_PAYMENT_METHODS);
  populateSelect('filterParcelas', MOCK_INSTALLMENTS);
  populateSelect('filterBandeira', MOCK_BRANDS);
  populateSelect('filterStatus', MOCK_STATUSES);
  populateSelect('filterContaProvedor', MOCK_PROVIDER_ACCOUNTS);
  populateSelect('filterSpread', MOCK_SPREADS);
}

// Update KPI UI elements
function updateKPIs(kpis) {
  document.getElementById('valTotalFaturamento').textContent = formatBRL(kpis.totalFaturamento);
  document.getElementById('valTotalEmpresa').textContent = formatBRL(kpis.totalEmpresa);
  document.getElementById('valTotalLiquido').textContent = formatBRL(kpis.totalLiquido);
  document.getElementById('valTotalParceiro').textContent = formatBRL(kpis.totalParceiro);
  document.getElementById('valTotalPagoClientes').textContent = formatBRL(kpis.totalPagoClientes);
  document.getElementById('valTotalComissaoCliente').textContent = formatBRL(kpis.totalComissaoCliente);
}

// Calculate KPIs based on a list of transactions
function calculateKPIsFromTransactions(list) {
  if (list.length === 0) {
    return {
      totalFaturamento: 0,
      totalEmpresa: 0,
      totalLiquido: 0,
      totalParceiro: 0,
      totalPagoClientes: 0,
      totalComissaoCliente: 0
    };
  }

  if (list.length === MOCK_TRANSACTIONS.length) {
    return INITIAL_KPIS;
  }

  const faturamento = list.reduce((acc, tx) => acc + tx.grossAmount, 0);
  const liquido = list.reduce((acc, tx) => acc + tx.netAmount, 0);
  const parceiro = list.reduce((acc, tx) => acc + (tx.partnerCommission || 0), 0);
  const empresa = liquido - parceiro;
  const pagoClientes = list.reduce((acc, tx) => acc + (tx.clientPaid || 0), 0);
  const comissaoCliente = list.reduce((acc, tx) => acc + (tx.clientCommission || 0), 0);

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
    return `
      <svg width="22" height="14" viewBox="0 0 24 14" fill="none">
        <path d="M7 2L3 7L7 12L12 7L7 2ZM17 2L12 7L17 12L21 7L17 2Z" fill="#32BCAD"/>
      </svg>
    `;
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

// Render transactions table
function renderTable() {
  const tbody = document.getElementById('transactionsTableBody');
  const countEl = document.getElementById('tableRecordCount');
  if (!tbody) return;

  // Sorting
  filteredTransactions.sort((a, b) => {
    let valA = a[currentSort.column];
    let valB = b[currentSort.column];

    if (valA === undefined) valA = '';
    if (valB === undefined) valB = '';

    if (typeof valA === 'string') {
      return currentSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return currentSort.order === 'asc' ? valA - valB : valB - valA;
  });

  // Pagination calculation
  const totalRecords = filteredTransactions.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage) || 1;
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = Math.min(startIndex + recordsPerPage, totalRecords);
  const currentSlice = filteredTransactions.slice(startIndex, endIndex);

  countEl.innerHTML = `Exibindo <strong>${totalRecords}</strong> transações`;

  if (totalRecords === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhuma transação encontrada com os filtros aplicados.
        </td>
      </tr>
    `;
    renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = currentSlice.map(tx => {
    let dateOnly = tx.date;
    let timeOnly = tx.time || '12:00';
    if (tx.date && tx.date.includes(' ')) {
      const parts = tx.date.split(' ');
      dateOnly = parts[0];
      timeOnly = parts[1].slice(0, 5);
    }

    const feeDisplay = tx.feePercent || (tx.fee ? `${tx.fee}%` : '4.98%');
    const spreadDisplay = tx.spread !== undefined ? tx.spread : (tx.grossAmount * 0.009);

    return `
      <tr>
        <td class="cell-terminal">${tx.terminal}</td>
        <td>
          <div class="cell-date">
            <span class="date-day">${dateOnly}</span>
            <span class="date-time">${timeOnly}</span>
          </div>
        </td>
        <td class="cell-company">${tx.company}</td>
        <td>
          <div class="cell-payment">
            <div class="payment-info">
              <span class="payment-method-name">${tx.method}</span>
              <span class="payment-installments">${tx.installments || '1x'}</span>
            </div>
            <div class="brand-badge" title="${tx.brand}">
              ${getBrandIcon(tx.brand)}
            </div>
          </div>
        </td>
        <td>${getStatusBadge(tx.status)}</td>
        <td class="cell-tax">${feeDisplay}</td>
        <td class="cell-gross">${formatBRL(tx.grossAmount)}</td>
        <td class="cell-net">${formatBRL(tx.netAmount)}</td>
        <td class="cell-spread">${formatBRL(spreadDisplay)}</td>
        <td class="cell-client-paid" style="text-align: center;">
          ${tx.clientPaid ? formatBRL(tx.clientPaid) : '-'}
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
  refreshIcons();
}

// Render Pagination controls
function renderPagination(totalPages) {
  const info = document.getElementById('paginationInfo');
  const controls = document.getElementById('paginationControls');

  info.textContent = `Página ${currentPage} de ${totalPages}`;

  let buttonsHtml = `
    <button class="page-btn" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  for (let p = 1; p <= totalPages; p++) {
    buttonsHtml += `
      <button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">
        ${p}
      </button>
    `;
  }

  buttonsHtml += `
    <button class="page-btn" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  controls.innerHTML = buttonsHtml;

  // Add click handlers
  document.querySelectorAll('#paginationControls button[data-page]').forEach(btn => {
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
  const targetSelected = selectedId || (isAdmin ? (currentNetworkUsers[0]?.id || 'USR-ADMIN') : currentUser.id);

  select.innerHTML = allowedUsers.map(u => {
    const level = calculateUserLevel(u.id);
    const isSelected = targetSelected === u.id ? 'selected' : '';
    const isMe = u.id === currentUser?.id ? ' (Você)' : '';
    return `<option value="${u.id}" ${isSelected}>[Nível ${level}] ${u.name}${isMe} - ${u.role}</option>`;
  }).join('');
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
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewComissoes) viewComissoes.style.display = 'block';
    if (navComissoes) navComissoes.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Comissões & Extrato';

    populateCommissionBeneficiarySelect();
    filterCommissions();
    renderCommissionsMetrics();
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
// MÓDULO DE COMISSÕES (EXTRATO, REPASSES E SPREAD DE REDE)
// ==========================================================================

// Get allowed commissions for current user based on hierarchy subtree
function getAllowedCommissions() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  if (isAdmin) return currentCommissions;

  const allowedUserIds = getUserSubtreeIds(currentUser.id, currentNetworkUsers);
  return currentCommissions.filter(c => allowedUserIds.includes(c.beneficiaryId));
}

// Render Commissions Top KPI Metrics
function renderCommissionsMetrics() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  const allowed = getAllowedCommissions();

  const totalSum = allowed.reduce((acc, c) => acc + (c.commissionAmount || 0), 0);
  
  // Direct: commissions of the logged in user with type 'Direta' (or all direct if admin)
  const directSum = allowed
    .filter(c => c.type === 'Direta' && (isAdmin || c.beneficiaryId === currentUser.id))
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);

  // Network: commissions of team bonus or downlines
  const networkSum = allowed
    .filter(c => c.type !== 'Direta' || (!isAdmin && c.beneficiaryId !== currentUser.id))
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);

  // Pending / Processing
  const pendingSum = allowed
    .filter(c => c.status !== 'Paga')
    .reduce((acc, c) => acc + (c.commissionAmount || 0), 0);

  const elTotal = document.getElementById('comValTotal');
  const elDirect = document.getElementById('comValDirect');
  const elNetwork = document.getElementById('comValNetwork');
  const elPending = document.getElementById('comValPending');

  if (elTotal) elTotal.textContent = formatBRL(totalSum);
  if (elDirect) elDirect.textContent = formatBRL(directSum);
  if (elNetwork) elNetwork.textContent = formatBRL(networkSum);
  if (elPending) elPending.textContent = formatBRL(pendingSum);
}

// Populate Beneficiary select options for filtering
function populateCommissionBeneficiarySelect() {
  const select = document.getElementById('filterCommissionBeneficiary');
  if (!select) return;

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.isAdmin ?? true;
  const allowedUserIds = isAdmin
    ? currentNetworkUsers.map(u => u.id)
    : getUserSubtreeIds(currentUser.id, currentNetworkUsers);

  const allowedUsers = currentNetworkUsers.filter(u => allowedUserIds.includes(u.id));

  select.innerHTML = `<option value="">Todos os beneficiários</option>` + allowedUsers.map(u => {
    const isMe = u.id === currentUser?.id ? ' (Você)' : '';
    return `<option value="${u.id}">${u.name}${isMe}</option>`;
  }).join('');
}

// Render Commissions Table
function renderCommissionsTable() {
  const tbody = document.getElementById('commissionsTableBody');
  const titleEl = document.getElementById('commissionsListTitle');
  if (!tbody) return;

  // Sorting
  filteredCommissions.sort((a, b) => {
    let valA = a[commissionsSort.column] || '';
    let valB = b[commissionsSort.column] || '';

    if (typeof valA === 'string') {
      return commissionsSort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return commissionsSort.order === 'asc' ? valA - valB : valB - valA;
  });

  const totalRecords = filteredCommissions.length;
  const totalPages = Math.ceil(totalRecords / commissionsPerPage) || 1;
  if (commissionsCurrentPage > totalPages) commissionsCurrentPage = totalPages;

  const startIndex = (commissionsCurrentPage - 1) * commissionsPerPage;
  const endIndex = Math.min(startIndex + commissionsPerPage, totalRecords);
  const currentSlice = filteredCommissions.slice(startIndex, endIndex);

  if (titleEl) {
    titleEl.textContent = `Extrato Detalhado de Comissões (${totalRecords})`;
  }

  if (totalRecords === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhum registro de comissão encontrado para os filtros selecionados.
        </td>
      </tr>
    `;
    renderCommissionsPagination(totalPages);
    return;
  }

  tbody.innerHTML = currentSlice.map(com => {
    const isDirect = com.type === 'Direta';
    const typeBadge = isDirect
      ? `<span class="badge-com-type direct"><i data-lucide="zap" style="width:11px;height:11px;"></i> Venda Direta</span>`
      : `<span class="badge-com-type network"><i data-lucide="git-branch" style="width:11px;height:11px;"></i> ${com.type}</span>`;

    let statusClass = 'paga';
    if (com.status === 'Pendente') statusClass = 'pendente';
    else if (com.status === 'Processando') statusClass = 'processando';

    const statusBadge = `<span class="badge-com-status ${statusClass}"><span class="badge-dot"></span> ${com.status}</span>`;

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 13px;">${com.id}</div>
          <div style="font-size: 11.5px; color: #94a3b8; font-family: monospace;">${com.date}</div>
        </td>
        <td>
          <span style="font-weight: 600; color: #334155; font-size: 13.5px;">${formatBRL(com.saleAmount)}</span>
          <div style="font-size: 11px; color: #94a3b8;">${com.terminal}</div>
        </td>
        <td class="cell-company-name"><strong>${com.company}</strong></td>
        <td>
          <div style="font-weight: 600; color: #0f172a; font-size: 13px;">${com.beneficiaryName}</div>
          <div style="font-size: 11.5px; color: #64748b;">${com.beneficiaryRole || 'Parceiro'}</div>
        </td>
        <td>
          <span class="badge-commission">${Number(com.ratePercent).toFixed(1)}%</span>
        </td>
        <td>
          <strong style="color: #059669; font-size: 14.5px; font-weight: 800;">${formatBRL(com.commissionAmount)}</strong>
        </td>
        <td>${typeBadge}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');

  renderCommissionsPagination(totalPages);
  refreshIcons();
}

// Render Commissions Pagination
function renderCommissionsPagination(totalPages) {
  const info = document.getElementById('commissionsPaginationInfo');
  const controls = document.getElementById('commissionsPaginationControls');
  if (!info || !controls) return;

  info.textContent = `Página ${commissionsCurrentPage} de ${totalPages}`;

  let buttonsHtml = `
    <button class="page-btn" id="btnComPrevPage" ${commissionsCurrentPage === 1 ? 'disabled' : ''}>
      <i data-lucide="chevron-left" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    buttonsHtml += `
      <button class="page-btn ${i === commissionsCurrentPage ? 'active' : ''}" data-com-page="${i}">
        ${i}
      </button>
    `;
  }

  buttonsHtml += `
    <button class="page-btn" id="btnComNextPage" ${commissionsCurrentPage === totalPages ? 'disabled' : ''}>
      <i data-lucide="chevron-right" style="width: 15px; height: 15px;"></i>
    </button>
  `;

  controls.innerHTML = buttonsHtml;

  controls.querySelectorAll('.page-btn[data-com-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      commissionsCurrentPage = parseInt(btn.getAttribute('data-com-page'));
      renderCommissionsTable();
    });
  });

  const prev = document.getElementById('btnComPrevPage');
  const next = document.getElementById('btnComNextPage');
  if (prev) {
    prev.addEventListener('click', () => {
      if (commissionsCurrentPage > 1) {
        commissionsCurrentPage--;
        renderCommissionsTable();
      }
    });
  }
  if (next) {
    next.addEventListener('click', () => {
      if (commissionsCurrentPage < totalPages) {
        commissionsCurrentPage++;
        renderCommissionsTable();
      }
    });
  }
}

// Filter Commissions Handler
function filterCommissions() {
  const term = document.getElementById('inputSearchCommissions')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('filterCommissionStatus')?.value || '';
  const type = document.getElementById('filterCommissionType')?.value || '';
  const order = document.getElementById('filterCommissionOrder')?.value || 'recentes';
  const beneficiary = document.getElementById('filterCommissionBeneficiary')?.value || '';

  const baseCommissions = getAllowedCommissions();

  filteredCommissions = baseCommissions.filter(com => {
    if (term) {
      const matchComp = (com.company || '').toLowerCase().includes(term);
      const matchBen = (com.beneficiaryName || '').toLowerCase().includes(term);
      const matchTerm = (com.terminal || '').toLowerCase().includes(term);
      const matchId = (com.id || '').toLowerCase().includes(term);
      if (!matchComp && !matchBen && !matchTerm && !matchId) return false;
    }
    if (status && com.status !== status) return false;
    if (type) {
      if (type === 'Direta' && com.type !== 'Direta') return false;
      if (type === 'Rede' && com.type === 'Direta') return false;
    }
    if (beneficiary && com.beneficiaryId !== beneficiary) return false;
    return true;
  });

  if (order === 'maior_valor') {
    commissionsSort = { column: 'commissionAmount', order: 'desc' };
  } else if (order === 'menor_valor') {
    commissionsSort = { column: 'commissionAmount', order: 'asc' };
  } else {
    commissionsSort = { column: 'date', order: 'desc' };
  }

  commissionsCurrentPage = 1;
  renderCommissionsTable();
  renderCommissionsMetrics();
}

// Export Commissions CSV
function exportCommissions() {
  const data = filteredCommissions;
  if (data.length === 0) {
    showToast('Nenhum dado para exportar.');
    return;
  }
  let csv = 'ID;Data;Valor Venda;Empresa;Beneficiário;Taxa;Comissão;Tipo;Status\n';
  data.forEach(c => {
    csv += `${c.id};${c.date};${c.saleAmount};"${c.company}";"${c.beneficiaryName}";${c.ratePercent}%;${c.commissionAmount};"${c.type}";"${c.status}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `extrato_comissoes_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Extrato de comissões exportado em CSV com sucesso!');
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

  // Commissions Filter Form & Actions
  const commissionsFilterForm = document.getElementById('commissionsFilterForm');
  if (commissionsFilterForm) {
    commissionsFilterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      filterCommissions();
    });
  }

  const btnClearCommissionsFilters = document.getElementById('btnClearCommissionsFilters');
  if (btnClearCommissionsFilters) {
    btnClearCommissionsFilters.addEventListener('click', () => {
      const inputSearch = document.getElementById('inputSearchCommissions');
      const selectStatus = document.getElementById('filterCommissionStatus');
      const selectType = document.getElementById('filterCommissionType');
      const selectOrder = document.getElementById('filterCommissionOrder');
      const selectBeneficiary = document.getElementById('filterCommissionBeneficiary');

      if (inputSearch) inputSearch.value = '';
      if (selectStatus) selectStatus.value = '';
      if (selectType) selectType.value = '';
      if (selectOrder) selectOrder.value = 'recentes';
      if (selectBeneficiary) selectBeneficiary.value = '';
      filterCommissions();
    });
  }

  const inputSearchCommissions = document.getElementById('inputSearchCommissions');
  if (inputSearchCommissions) {
    inputSearchCommissions.addEventListener('input', () => {
      filterCommissions();
    });
  }

  const selectFilterStatus = document.getElementById('filterCommissionStatus');
  if (selectFilterStatus) selectFilterStatus.addEventListener('change', filterCommissions);

  const selectFilterType = document.getElementById('filterCommissionType');
  if (selectFilterType) selectFilterType.addEventListener('change', filterCommissions);

  const selectFilterOrder = document.getElementById('filterCommissionOrder');
  if (selectFilterOrder) selectFilterOrder.addEventListener('change', filterCommissions);

  const selectFilterBeneficiary = document.getElementById('filterCommissionBeneficiary');
  if (selectFilterBeneficiary) selectFilterBeneficiary.addEventListener('change', filterCommissions);

  const btnExportCommissions = document.getElementById('btnExportCommissions');
  if (btnExportCommissions) {
    btnExportCommissions.addEventListener('click', exportCommissions);
  }

  // Filter Form Submit (Transações)
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const empresa = document.getElementById('filterEmpresas').value;
      const parceiro = document.getElementById('filterParceiro').value;
      const terminal = document.getElementById('filterTerminal').value;
      const metodo = document.getElementById('filterFormaPagamento').value;
      const bandeira = document.getElementById('filterBandeira').value;
      const status = document.getElementById('filterStatus').value;

      filteredTransactions = currentTransactions.filter(tx => {
        if (empresa && tx.company !== empresa) return false;
        if (parceiro && tx.partner !== parceiro) return false;
        if (terminal && !tx.terminal.includes(terminal)) return false;
        if (metodo && !tx.method.includes(metodo)) return false;
        if (bandeira && tx.brand !== bandeira) return false;
        if (status && tx.status !== status) return false;
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
      if (confirm(`Deseja realmente excluir ${count} empresa(s) selecionada(s)? Esta ação é permanente.`)) {
        currentCompanies = currentCompanies.filter(c => !selectedCompanyIds.has(c.id));
        filteredCompanies = filteredCompanies.filter(c => !selectedCompanyIds.has(c.id));
        selectedCompanyIds.clear();
        renderCompaniesTable();
        showToast(`${count} empresa(s) excluída(s) com sucesso.`);
      }
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

  const closeNewCompanyModal = () => newCompanyModal?.classList.remove('open');
  const openNewCompanyModal = () => {
    populateCompanyPartnerSelect();
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
      const status = document.getElementById('newCompanyStatus').value;

      const newComp = {
        id: `EMP-${Date.now().toString().slice(-4)}`,
        name: name.toUpperCase(),
        doc: doc || '-',
        owner: name.split(' ')[0].toUpperCase(),
        email: email.toLowerCase(),
        phone: phone || '( ) 9999-9999',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        status: status || 'Ativo',
        registeredBy
      };

      currentCompanies.unshift(newComp);
      newCompanyForm.reset();
      closeNewCompanyModal();
      filterCompanies();
      updateDashboardStats();
      showToast(`"${newComp.name}" cadastrado(a) com sucesso!`);
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

  // Close modals on backdrop click
  const newNetworkUserModal = document.getElementById('newNetworkUserModal');
  window.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
    if (e.target === detailsModal) closeDetailsModal();
    if (e.target === newCompanyModal) closeNewCompanyModal();
    if (e.target === newNetworkUserModal) closeNewNetworkUserModal();
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

// Load Initial Data (from Supabase or Mock fallback)
async function loadInitialData() {
  updateSupabaseStatus();

  const remoteTransactions = await fetchTransactionsFromSupabase();
  if (remoteTransactions && remoteTransactions.length > 0) {
    currentTransactions = remoteTransactions;
    filteredTransactions = [...remoteTransactions];
  } else {
    currentTransactions = [...MOCK_TRANSACTIONS];
    filteredTransactions = [...MOCK_TRANSACTIONS];
  }

  currentPage = 1;
  renderTable();
  renderCompaniesTable();
  updateKPIs(calculateKPIsFromTransactions(filteredTransactions));

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
