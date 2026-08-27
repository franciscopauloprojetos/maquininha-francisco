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
  MOCK_TRANSACTIONS
} from './mockData.js';

import {
  getSupabaseClient,
  setSupabaseCredentials,
  fetchTransactionsFromSupabase,
  SUPABASE_CONFIG
} from './supabaseClient.js';

// Application State
let currentTransactions = [...MOCK_TRANSACTIONS];
let filteredTransactions = [...MOCK_TRANSACTIONS];
let currentPage = 1;
const recordsPerPage = 10;
let currentSort = { column: 'date', order: 'desc' };

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

// Setup Event Listeners
function setupEvents() {
  // Sidebar Toggle
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Filter Form Submit
  const filterForm = document.getElementById('filterForm');
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
    showToast('Filtros aplicados com sucesso!');
  });

  // Clear Filters
  const btnClearFilters = document.getElementById('btnClearFilters');
  btnClearFilters.addEventListener('click', () => {
    filterForm.reset();
    document.getElementById('filterDataInicio').value = '01/07/2026';
    document.getElementById('filterDataTermino').value = '27/08/2026';
    document.getElementById('filterValorMinimo').value = 'R$ 0,00';

    filteredTransactions = [...currentTransactions];
    currentPage = 1;
    renderTable();
    updateKPIs(INITIAL_KPIS);
    showToast('Filtros redefinidos para o padrão!');
  });

  // Table Search
  const tableSearchInput = document.getElementById('tableSearchInput');
  tableSearchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
      filteredTransactions = [...currentTransactions];
    } else {
      filteredTransactions = currentTransactions.filter(tx => {
        return (
          tx.id.toLowerCase().includes(term) ||
          tx.company.toLowerCase().includes(term) ||
          tx.partner.toLowerCase().includes(term) ||
          tx.terminal.toLowerCase().includes(term) ||
          tx.brand.toLowerCase().includes(term) ||
          tx.status.toLowerCase().includes(term)
        );
      });
    }
    currentPage = 1;
    renderTable();
  });

  // Sort Table Columns
  document.querySelectorAll('.data-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.getAttribute('data-sort');
      if (currentSort.column === col) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.column = col;
        currentSort.order = 'asc';
      }
      renderTable();
    });
  });

  // Modal: Gerar Relatório
  const reportModal = document.getElementById('reportModal');
  const btnOpenReportModal = document.getElementById('btnOpenReportModal');
  const btnCloseReportModal = document.getElementById('btnCloseReportModal');
  const btnCancelReport = document.getElementById('btnCancelReport');
  const btnConfirmReport = document.getElementById('btnConfirmReport');

  const closeReportModal = () => reportModal.classList.remove('open');

  btnOpenReportModal.addEventListener('click', () => reportModal.classList.add('open'));
  btnCloseReportModal.addEventListener('click', closeReportModal);
  btnCancelReport.addEventListener('click', closeReportModal);

  btnConfirmReport.addEventListener('click', () => {
    const format = document.getElementById('reportFormat').value.toUpperCase();
    closeReportModal();
    showToast(`Relatório exportado em formato ${format} com sucesso!`);
  });

  // Modal: Detalhes
  const detailsModal = document.getElementById('detailsModal');
  const btnCloseDetailsModal = document.getElementById('btnCloseDetailsModal');
  const btnCloseDetailsBtn = document.getElementById('btnCloseDetailsBtn');

  const closeDetailsModal = () => detailsModal.classList.remove('open');
  btnCloseDetailsModal.addEventListener('click', closeDetailsModal);
  btnCloseDetailsBtn.addEventListener('click', closeDetailsModal);

  // Modal: Supabase
  const supabaseModal = document.getElementById('supabaseModal');
  const btnOpenSupabaseModal = document.getElementById('btnOpenSupabaseModal');
  const btnCloseSupabaseModal = document.getElementById('btnCloseSupabaseModal');
  const btnCancelSupabase = document.getElementById('btnCancelSupabase');
  const btnSaveSupabase = document.getElementById('btnSaveSupabase');
  const inputSupabaseUrl = document.getElementById('inputSupabaseUrl');
  const inputSupabaseKey = document.getElementById('inputSupabaseKey');

  const closeSupabaseModal = () => supabaseModal.classList.remove('open');

  if (btnOpenSupabaseModal) {
    btnOpenSupabaseModal.addEventListener('click', () => {
      inputSupabaseUrl.value = SUPABASE_CONFIG.url || '';
      inputSupabaseKey.value = SUPABASE_CONFIG.anonKey || '';
      supabaseModal.classList.add('open');
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
  window.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
    if (e.target === detailsModal) closeDetailsModal();
    if (e.target === supabaseModal) closeSupabaseModal();
  });

  // Logout button simulation
  document.getElementById('logoutBtn').addEventListener('click', () => {
    showToast('Sessão encerrada com sucesso.', 'success');
  });
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
    showToast(`Conectado ao Supabase: ${remoteTransactions.length} transações carregadas!`);
  } else {
    currentTransactions = [...MOCK_TRANSACTIONS];
    filteredTransactions = [...MOCK_TRANSACTIONS];
  }

  currentPage = 1;
  renderTable();
  updateKPIs(calculateKPIsFromTransactions(filteredTransactions));
}

// Initial Boot
document.addEventListener('DOMContentLoaded', async () => {
  initFilters();
  setupEvents();
  await loadInitialData();
  refreshIcons();
});
