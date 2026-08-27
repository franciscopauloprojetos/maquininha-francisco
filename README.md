# Maquininha Francisco - Front-End de Transações & Gestão Financeira

Painel administrativo e financeiro completo para controle de transações, parceiros, terminais e relatórios adquirentes da **Maquininha Francisco**.

---

## 📸 Funcionalidades

- **Menu Lateral Completo**: Dashboard, Empresas, Transações, Pagamentos, Terminais, Contratos, Parceiros, Usuários, Contas de Provedor, Alertas, Segurança e Ajuda.
- **Filtros Avançados de Transação**:
  - Filtro por Empresa, Parceiro, Terminal, Forma de Pagamento e Parcelas.
  - Filtro por Bandeira, Status, Conta de Provedor e Período de Data personalizado.
  - Filtro por Spread e Valor mínimo.
- **Painel de Indicadores e Totais (KPIs)**:
  - Total de Faturamento
  - Total Empresa
  - Total Líquido
  - Total Parceiro
  - Total Pago Clientes
  - Total Comissão Cliente
- **Tabela de Transações Detalhadas**:
  - Busca em tempo real por ID, empresa, parceiro, terminal e bandeira.
  - Ordenação por colunas.
  - Badges visuais de status (*Aprovada*, *Pendente*, *Cancelada*, *Estornada*).
  - Modal de visualização detalhada por transação.
  - Exportação de relatórios em múltiplos formatos (Excel, CSV, PDF).

---

## 🛠️ Tecnologias Utilizadas

- **HTML5 Semântico**
- **CSS3 Moderno** (Design System personalizado com CSS Variables, Grid e Flexbox)
- **JavaScript (ES6+)**
- **Lucide Icons**
- **Google Fonts (Plus Jakarta Sans)**
- **Node.js** (Servidor HTTP nativo de desenvolvimento)

---

## 🚀 Como Executar o Projeto

1. Clone o repositório ou baixe os arquivos:
   ```bash
   git clone https://github.com/franciscopauloprojetos/maquininha-francisco.git
   cd maquininha-francisco
   ```

2. Inicie o servidor local:
   ```bash
   node server.js
   ```

3. Abra o navegador no endereço indicado:
   ```
   http://localhost:3005/
   ```

---

## 📂 Estrutura de Arquivos

```
├── index.html           # Estrutura principal da aplicação
├── server.js            # Servidor HTTP local em Node.js
├── styles/
│   ├── variables.css    # Tokens de design, cores e variáveis CSS
│   ├── layout.css       # Layout da Sidebar, Header e Grid principal
│   └── components.css   # Estilos dos Cards, Formulários, KPIs e Tabela
├── js/
│   ├── mockData.js      # Base de dados simulada e constantes calibradas
│   └── main.js          # Lógica de filtros, KPIs, ordenação e modais
└── README.md
```
