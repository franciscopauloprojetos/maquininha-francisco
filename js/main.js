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
  MOCK_NETWORK_USERS
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
  saveNetworkUsers
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
function switchView(viewName) {
  const viewTransacoes = document.getElementById('view-transacoes');
  const viewEmpresas = document.getElementById('view-empresas');
  const viewDashboard = document.getElementById('view-dashboard');
  const viewRede = document.getElementById('view-rede');
  const navTransacoes = document.getElementById('nav-transacoes');
  const navEmpresas = document.getElementById('nav-empresas');
  const navDashboard = document.getElementById('nav-dashboard');
  const navRede = document.getElementById('nav-rede');
  const pageTitle = document.getElementById('pageHeaderTitle');

  // Reset active classes
  [navTransacoes, navEmpresas, navDashboard, navRede].forEach(el => el && el.classList.remove('active'));

  if (viewName === 'empresas') {
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewRede) viewRede.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'block';
    if (navEmpresas) navEmpresas.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Empresas';
    renderCompaniesTable();
  } else if (viewName === 'dashboard') {
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewRede) viewRede.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (navDashboard) navDashboard.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    updateDashboardStats();
  } else if (viewName === 'rede') {
    if (viewTransacoes) viewTransacoes.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewRede) viewRede.style.display = 'block';
    if (navRede) navRede.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Rede & Hierarquia de Usuários';
    renderNetworkView();
  } else {
    // Default: transacoes
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (viewEmpresas) viewEmpresas.style.display = 'none';
    if (viewRede) viewRede.style.display = 'none';
    if (viewTransacoes) viewTransacoes.style.display = 'block';
    if (navTransacoes) navTransacoes.classList.add('active');
    if (pageTitle) pageTitle.textContent = 'Transações';
  }
  refreshIcons();
}

// Update Dashboard Statistics
function updateDashboardStats() {
  const elEmpresas = document.getElementById('dashValEmpresas');
  const elTransacoes = document.getElementById('dashValTransacoes');
  const elTerminais = document.getElementById('dashValTerminais');
  const elVolume = document.getElementById('dashValVolume');

  if (elEmpresas) elEmpresas.textContent = currentCompanies.filter(c => c.status === 'Ativo').length || '16';
  if (elTransacoes) elTransacoes.textContent = '45';
  if (elTerminais) elTerminais.textContent = '18';
  if (elVolume) elVolume.textContent = 'R$ 213.025,44';
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
    titleEl.textContent = `Lista de Empresas (${totalRecords})`;
  }

  if (totalRecords === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhuma empresa encontrada com os filtros pesquisados.
        </td>
      </tr>
    `;
    renderCompaniesPagination(totalPages);
    return;
  }

  tbody.innerHTML = currentSlice.map(comp => {
    const statusBadge = comp.status === 'Ativo'
      ? `<span class="badge-company-active">Ativo</span>`
      : `<span class="badge-company-inactive">Inativo</span>`;

    return `
      <tr>
        <td class="cell-company-name">${comp.name}</td>
        <td class="cell-owner">${comp.owner}</td>
        <td class="cell-email">${comp.email}</td>
        <td class="cell-contact">${comp.phone || '-'}</td>
        <td class="cell-created-at">${comp.createdAt}</td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn-delete-company delete-comp-btn" data-id="${comp.id}" title="Excluir Empresa">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderCompaniesPagination(totalPages);
  refreshIcons();

  // Attach delete events
  document.querySelectorAll('.delete-comp-btn').forEach(btn => {
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
  const name = comp ? comp.name : 'Empresa';
  if (confirm(`Deseja realmente excluir a empresa "${name}"?`)) {
    currentCompanies = currentCompanies.filter(c => c.id !== id);
    filteredCompanies = filteredCompanies.filter(c => c.id !== id);
    renderCompaniesTable();
    showToast(`Empresa "${name}" excluída com sucesso.`);
  }
}

// Filter Companies Handler
function filterCompanies() {
  const term = document.getElementById('inputSearchCompany')?.value.trim().toLowerCase() || '';
  const status = document.getElementById('filterCompanyStatus')?.value || '';
  const order = document.getElementById('filterCompanyOrder')?.value || 'recentes';

  filteredCompanies = currentCompanies.filter(comp => {
    if (term) {
      const matchName = comp.name.toLowerCase().includes(term);
      const matchOwner = comp.owner.toLowerCase().includes(term);
      const matchEmail = comp.email.toLowerCase().includes(term);
      if (!matchName && !matchOwner && !matchEmail) return false;
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
}

// Render network metrics
function renderNetworkMetrics() {
  const statTotal = document.getElementById('statTotalNetworkUsers');
  const statDirect = document.getElementById('statDirectUsers');
  const statDepth = document.getElementById('statTreeDepth');
  const statAvg = document.getElementById('statAvgCommission');

  if (statTotal) statTotal.textContent = currentNetworkUsers.length;
  
  const root = currentNetworkUsers.find(u => !u.parentId || u.id === 'USR-ADMIN');
  const rootId = root ? root.id : 'USR-ADMIN';
  const directUsers = getUserDirectChildren(rootId);
  if (statDirect) statDirect.textContent = directUsers.length;

  let maxDepth = 0;
  let sumCommission = 0;
  currentNetworkUsers.forEach(u => {
    const lvl = calculateUserLevel(u.id);
    if (lvl > maxDepth) maxDepth = lvl;
    sumCommission += Number(u.commissionRate || 0);
  });

  if (statDepth) statDepth.textContent = `${maxDepth + 1} Níveis`;
  if (statAvg && currentNetworkUsers.length > 0) {
    statAvg.textContent = `${(sumCommission / currentNetworkUsers.length).toFixed(1)}%`;
  }
}

// Render visual hierarchy tree (Recursive)
function renderNetworkTree() {
  const container = document.getElementById('networkTreeWrapper');
  if (!container) return;

  const root = currentNetworkUsers.find(u => !u.parentId || u.id === 'USR-ADMIN') || currentNetworkUsers[0];
  if (!root) {
    container.innerHTML = '<p style="color: #64748b; padding: 20px;">Nenhum usuário cadastrado na rede.</p>';
    return;
  }

  function buildNodeHTML(user) {
    const isRoot = !user.parentId || user.id === 'USR-ADMIN';
    const level = calculateUserLevel(user.id);
    const children = getUserDirectChildren(user.id);
    const initials = user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    let html = `
      <div class="tree-branch">
        <div class="tree-node ${isRoot ? 'is-root' : ''}" data-user-id="${user.id}">
          <div class="tree-node-header">
            <div class="tree-node-avatar">${initials}</div>
            <div class="tree-node-title-group">
              <span class="tree-node-name" title="${user.name}">${user.name}</span>
              <span class="tree-node-role">${user.role || 'Membro'}</span>
            </div>
          </div>
          <div class="tree-node-badges">
            <span class="badge-level">Nível ${level}</span>
            <span class="badge-commission">${user.commissionRate}% Comiss.</span>
          </div>
          <div class="tree-node-footer">
            <span class="tree-downlines-count">
              <i data-lucide="users" style="width: 12px; height: 12px;"></i>
              ${children.length} ${children.length === 1 ? 'indicado' : 'indicados'}
            </span>
            <button type="button" class="btn-add-subnode" data-parent-id="${user.id}" title="Cadastrar usuário abaixo deste nó">
              <i data-lucide="plus" style="width: 11px; height: 11px;"></i>
              <span>+ Indicar</span>
            </button>
          </div>
        </div>
    `;

    if (children.length > 0) {
      html += `<div class="tree-branch-connector"></div>`;
      html += `<div class="tree-children">`;
      children.forEach(child => {
        html += buildNodeHTML(child);
      });
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  container.innerHTML = buildNodeHTML(root);

  // Attach quick add buttons
  container.querySelectorAll('.btn-add-subnode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parentId = btn.getAttribute('data-parent-id');
      openNewNetworkUserModal(parentId);
    });
  });

  refreshIcons();
}

// Render network data table
function renderNetworkTable() {
  const tbody = document.getElementById('networkTableBody');
  if (!tbody) return;

  if (filteredNetworkUsers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: #64748b;">
          Nenhum membro encontrado na rede.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredNetworkUsers.map(u => {
    const isRoot = !u.parentId || u.id === 'USR-ADMIN';
    const level = calculateUserLevel(u.id);
    const uplineUser = currentNetworkUsers.find(parent => parent.id === u.parentId);
    const uplineName = uplineUser ? uplineUser.name : '👑 Raiz (Admin Master)';
    const initials = u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return `
      <tr>
        <td>
          <div class="table-network-user">
            <div class="user-avatar-sm" style="${isRoot ? 'background: #fef3c7; color: #d97706;' : ''}">${initials}</div>
            <div class="user-name-col">
              <span class="user-full-name">${u.name}</span>
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
          ${!isRoot ? `
            <button type="button" class="btn-delete-company btn-delete-user" data-user-id="${u.id}" title="Excluir Usuário da Rede">
              <i data-lucide="trash-2"></i>
            </button>
          ` : '<span style="font-size: 12px; color: #94a3b8; font-weight: 600;">Admin</span>'}
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

  select.innerHTML = currentNetworkUsers.map(u => {
    const level = calculateUserLevel(u.id);
    const isSelected = selectedId === u.id ? 'selected' : '';
    return `<option value="${u.id}" ${isSelected}>[Nível ${level}] ${u.name} (${u.role})</option>`;
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

  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
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

  const btnClearCompaniesFilters = document.getElementById('btnClearCompaniesFilters');
  if (btnClearCompaniesFilters) {
    btnClearCompaniesFilters.addEventListener('click', () => {
      if (companiesFilterForm) companiesFilterForm.reset();
      filteredCompanies = [...currentCompanies];
      companiesCurrentPage = 1;
      renderCompaniesTable();
      showToast('Filtros de empresas limpos.');
    });
  }

  // Modal: Nova Empresa
  const newCompanyModal = document.getElementById('newCompanyModal');
  const btnOpenNewCompanyModal = document.getElementById('btnOpenNewCompanyModal');
  const btnCloseNewCompanyModal = document.getElementById('btnCloseNewCompanyModal');
  const btnCancelNewCompany = document.getElementById('btnCancelNewCompany');
  const newCompanyForm = document.getElementById('newCompanyForm');

  const closeNewCompanyModal = () => newCompanyModal?.classList.remove('open');

  if (btnOpenNewCompanyModal) {
    btnOpenNewCompanyModal.addEventListener('click', () => {
      newCompanyModal?.classList.add('open');
    });
  }

  if (btnCloseNewCompanyModal) btnCloseNewCompanyModal.addEventListener('click', closeNewCompanyModal);
  if (btnCancelNewCompany) btnCancelNewCompany.addEventListener('click', closeNewCompanyModal);

  if (newCompanyForm) {
    newCompanyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('newCompanyName').value.trim();
      const owner = document.getElementById('newCompanyOwner').value.trim();
      const email = document.getElementById('newCompanyEmail').value.trim();
      const phone = document.getElementById('newCompanyPhone').value.trim();
      const status = document.getElementById('newCompanyStatus').value;

      const newComp = {
        id: `EMP-${Date.now().toString().slice(-4)}`,
        name: name.toUpperCase(),
        owner: owner.toUpperCase(),
        email: email.toLowerCase(),
        phone: phone || '(41) 99999-0000',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        status: status || 'Ativo'
      };

      currentCompanies.unshift(newComp);
      filteredCompanies.unshift(newComp);
      newCompanyForm.reset();
      closeNewCompanyModal();
      renderCompaniesTable();
      showToast(`Empresa "${newComp.name}" cadastrada com sucesso!`);
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

  // Modal: Supabase
  const supabaseModal = document.getElementById('supabaseModal');
  const btnOpenSupabaseModal = document.getElementById('btnOpenSupabaseModal');
  const btnCloseSupabaseModal = document.getElementById('btnCloseSupabaseModal');
  const btnCancelSupabase = document.getElementById('btnCancelSupabase');
  const btnSaveSupabase = document.getElementById('btnSaveSupabase');
  const inputSupabaseUrl = document.getElementById('inputSupabaseUrl');
  const inputSupabaseKey = document.getElementById('inputSupabaseKey');

  const closeSupabaseModal = () => supabaseModal?.classList.remove('open');

  if (btnOpenSupabaseModal) {
    btnOpenSupabaseModal.addEventListener('click', () => {
      inputSupabaseUrl.value = SUPABASE_CONFIG.url || '';
      inputSupabaseKey.value = SUPABASE_CONFIG.anonKey || '';
      supabaseModal?.classList.add('open');
    });
  }

  if (btnCloseSupabaseModal) btnCloseSupabaseModal.addEventListener('click', closeSupabaseModal);
  if (btnCancelSupabase) btnCancelSupabase.addEventListener('click', closeSupabaseModal);

  if (btnSaveSupabase) {
    btnSaveSupabase.addEventListener('click', async () => {
      const url = inputSupabaseUrl.value.trim();
      const key = inputSupabaseKey.value.trim();
      if (!url || !key) {
        showToast('Preencha a URL e a Anon Key do Supabase.', 'success');
        return;
      }
      setSupabaseCredentials(url, key);
      closeSupabaseModal();
      showToast('Credenciais salvas! Conectando ao banco...');
      await loadInitialData();
    });
  }

  // Close modals on backdrop click
  const newNetworkUserModal = document.getElementById('newNetworkUserModal');
  window.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
    if (e.target === detailsModal) closeDetailsModal();
    if (e.target === supabaseModal) closeSupabaseModal();
    if (e.target === newCompanyModal) closeNewCompanyModal();
    if (e.target === newNetworkUserModal) closeNewNetworkUserModal();
  });

  // Network Navigation Link
  if (navRede) {
    navRede.addEventListener('click', (e) => {
      e.preventDefault();
      switchView('rede');
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
      if (treeViewContainer) treeViewContainer.style.display = 'block';
      if (networkTableViewContainer) networkTableViewContainer.style.display = 'none';
      currentNetworkViewMode = 'tree';
    });

    btnModeTable.addEventListener('click', () => {
      btnModeTable.classList.add('active');
      btnModeTree.classList.remove('active');
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
      const parentId = document.getElementById('newUserParentId').value;
      const name = document.getElementById('newUserName').value.trim();
      const email = document.getElementById('newUserEmail').value.trim();
      const password = document.getElementById('newUserPassword').value.trim();
      const role = document.getElementById('newUserRole').value;
      const commissionRate = parseFloat(document.getElementById('newUserCommission').value) || 5.0;
      const phone = document.getElementById('newUserPhone').value.trim() || '(41) 99999-0000';
      const status = document.getElementById('newUserStatus').value || 'Ativo';

      // Check if email already exists
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
      showToast(`Usuário ${name} cadastrado com sucesso na rede hierárquica!`);
    });
  }

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
}

// Authentication State Controller
function checkAuthState() {
  const loginScreen = document.getElementById('loginScreen');
  const appContainer = document.getElementById('appContainer');
  const headerUserName = document.getElementById('headerUserName');

  if (isAuthenticated()) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'flex';
    const user = getCurrentUser();
    if (headerUserName && user) {
      headerUserName.textContent = user.shortName || user.name || 'Francisco';
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
