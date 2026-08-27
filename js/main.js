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

// Application State
let currentTransactions = [...MOCK_TRANSACTIONS];
let filteredTransactions = [...MOCK_TRANSACTIONS];
let currentPage = 1;
const recordsPerPage = 6;
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

  // Clear existing options
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

  // If showing full default set, preserve calibrated screenshot baseline figures
  if (list.length === MOCK_TRANSACTIONS.length) {
    return INITIAL_KPIS;
  }

  const faturamento = list.reduce((acc, tx) => acc + tx.grossAmount, 0);
  const liquido = list.reduce((acc, tx) => acc + tx.netAmount, 0);
  const parceiro = list.reduce((acc, tx) => acc + tx.partnerCommission, 0);
  const empresa = liquido - parceiro;
  const pagoClientes = list.reduce((acc, tx) => acc + tx.clientPaid, 0);
  const comissaoCliente = list.reduce((acc, tx) => acc + tx.clientCommission, 0);

  return {
    totalFaturamento: faturamento,
    totalEmpresa: empresa,
    totalLiquido: liquido,
    totalParceiro: parceiro,
    totalPagoClientes: pagoClientes,
    totalComissaoCliente: comissaoCliente
  };
}

// Format badge based on status
function getStatusBadge(status) {
  let badgeClass = 'badge-approved';
  if (status === 'Pendente') badgeClass = 'badge-pending';
  else if (status === 'Cancelada') badgeClass = 'badge-cancelled';
  else if (status === 'Estornada') badgeClass = 'badge-refunded';

  return `
    <span class="badge ${badgeClass}">
      <span class="badge-dot"></span>
      ${status}
    </span>
  `;
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
        <td colspan="12" style="text-align: center; padding: 40px; color: #94a3b8;">
          Nenhuma transação encontrada com os filtros aplicados.
        </td>
      </tr>
    `;
    renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = currentSlice.map(tx => {
    return `
      <tr>
        <td style="font-weight: 600; color: #0f172a;">${tx.id}</td>
        <td style="color: #64748b;">${tx.date}</td>
        <td><strong>${tx.company}</strong></td>
        <td>${tx.partner}</td>
        <td>${tx.terminal.split(' ')[0]}</td>
        <td>${tx.method} ${tx.installments !== '1x' ? `(${tx.installments})` : ''}</td>
        <td>${tx.brand}</td>
        <td style="font-weight: 600;">${formatBRL(tx.grossAmount)}</td>
        <td style="color: #64748b;">${formatBRL(tx.fee)}</td>
        <td style="font-weight: 700; color: #00ba50;">${formatBRL(tx.netAmount)}</td>
        <td>${getStatusBadge(tx.status)}</td>
        <td style="text-align: center;">
          <button class="table-action-btn view-details-btn" data-id="${tx.id}" title="Ver Detalhes">
            <i data-lucide="eye"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  renderPagination(totalPages);
  refreshIcons();

  // Attach detail events
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      showTransactionDetails(id);
    });
  });
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

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === reportModal) closeReportModal();
    if (e.target === detailsModal) closeDetailsModal();
  });

  // Logout button simulation
  document.getElementById('logoutBtn').addEventListener('click', () => {
    showToast('Sessão encerrada com sucesso.', 'success');
  });
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
  initFilters();
  updateKPIs(INITIAL_KPIS);
  renderTable();
  setupEvents();
  refreshIcons();
});
