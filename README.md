# 🏥 Sisagenda — Sistema de Agendamento para Clínicas

Plataforma SaaS multi-tenant para gestão de clínicas e consultórios médicos. Permite que múltiplas clínicas operem de forma isolada na mesma infraestrutura, com controle centralizado por um Super Admin.

---

## 🚀 Tecnologias Utilizadas

### Frontend
| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | 19 | Framework de UI |
| Vite | 7 | Bundler / Dev server |
| React Router DOM | 7 | Roteamento SPA |
| Tailwind CSS | 3 | Estilização utilitária |
| Axios | 1 | Requisições HTTP à API |
| Chart.js + react-chartjs-2 | 4/5 | Gráficos no Dashboard e Financeiro |
| react-big-calendar | 1 | Calendário de agendamentos |
| react-hot-toast | 2 | Notificações / feedback |
| react-select | 5 | Selects avançados |
| jwt-decode | 4 | Decodificação do JWT no cliente |
| date-fns | 4 | Manipulação de datas |
| jsPDF + html2canvas | — | Exportação de relatórios em PDF |

### Backend (API REST — repositório separado)
| Tecnologia | Finalidade |
|---|---|
| Node.js + Express | Servidor HTTP |
| Sequelize | ORM para PostgreSQL |
| PostgreSQL | Banco de dados relacional |
| JSON Web Token (JWT) | Autenticação stateless |
| Bcrypt | Hash de senhas |
| Zod | Validação de entrada |
| PM2 | Gerenciador de processos (produção) |

### Serviços Externos
| Serviço | Finalidade |
|---|---|
| Kentro (WhatsApp API) | Envio de notificações de agendamento via WhatsApp |
| Render | Hospedagem do backend (Node.js) |
| Neon | Banco de dados PostgreSQL serverless |
| Vercel | Deploy do frontend |

---

## 🏗️ Arquitetura Geral

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Vercel)                 │
│  React + Vite + TailwindCSS                         │
│  ┌─────────────┐  ┌──────────────────────────────┐  │
│  │  AuthLayout │  │      DashboardLayout         │  │
│  │  LoginPage  │  │  Sidebar + Topbar + <Outlet> │  │
│  └─────────────┘  └──────────────────────────────┘  │
└────────────────────────┬────────────────────────────┘
                         │ HTTPS / REST (Axios)
┌────────────────────────▼────────────────────────────┐
│                 BACKEND (Render)                    │
│  Node.js + Express                                  │
│  ┌──────────────────┐  ┌──────────────────────────┐ │
│  │  authMiddleware  │  │  superAdminMiddleware    │ │
│  └──────────────────┘  └──────────────────────────┘ │
│  Controllers: Users · Companies · Patients ·        │
│               Doctors · Appointments · Billing      │
└────────────────────────┬────────────────────────────┘
                         │ Sequelize ORM
┌────────────────────────▼────────────────────────────┐
│         BANCO DE DADOS (Neon — PostgreSQL Serverless)│
└─────────────────────────────────────────────────────┘
```

---

## 🗃️ Organização do Banco de Dados

### Modelo Multi-Tenant
Cada clínica possui um `company_id` exclusivo. Todos os dados (usuários, pacientes, médicos, agendamentos e financeiro) são **isolados por `company_id`**, garantindo que uma clínica nunca acesse dados de outra.

### Principais Tabelas

```sql
companies
  id            UUID/INT  PK
  name          VARCHAR   -- Nome da clínica
  status        BOOLEAN   -- true = ativa | false = suspensa
  created_at    TIMESTAMP

users
  id            UUID/INT  PK
  company_id    INT       FK → companies (NULL para superadmin)
  name          VARCHAR
  email         VARCHAR   UNIQUE
  password      VARCHAR   -- bcrypt hash
  role          ENUM      -- 'ADMIN' | 'SUPPORT' | 'RECEPTIONIST' | 'USER'
  is_super_admin BOOLEAN  -- Acesso global ao painel SaaS

patients
  id            UUID/INT  PK
  company_id    INT       FK → companies
  name          VARCHAR
  email         VARCHAR
  cpf           VARCHAR
  number        VARCHAR   -- Telefone para WhatsApp
  birth_date    DATE
  gender        VARCHAR
  address       VARCHAR
  city / state / zip_code VARCHAR

doctors
  id            UUID/INT  PK
  company_id    INT       FK → companies
  name          VARCHAR
  email         VARCHAR
  crm           VARCHAR
  specialty     VARCHAR
  color         VARCHAR   -- Cor no calendário (hex)
  bio           TEXT

appointments (agendamentos)
  id            UUID/INT  PK
  company_id    INT       FK → companies
  patient_id    INT       FK → patients
  doctor_id     INT       FK → doctors
  date          DATETIME
  status        ENUM      -- 'scheduled' | 'completed' | 'cancelled'
  notes         TEXT

billing (financeiro)
  id            UUID/INT  PK
  company_id    INT       FK → companies
  patient_id    INT       FK → patients
  amount        DECIMAL
  type          ENUM      -- 'income' | 'expense'
  status        ENUM      -- 'paid' | 'pending'
  date          DATE
  description   TEXT
```

---

## 📁 Estrutura do Frontend

```
src/
├── api/
│   └── axiosConfig.js        # Instância Axios com baseURL e interceptors JWT
├── components/
│   ├── Sidebar.jsx            # Navegação lateral (role-aware)
│   ├── Topbar.jsx             # Barra superior com perfil e logout
│   ├── Modal.jsx              # Modal genérico reutilizável
│   └── ConfirmModal.jsx       # Modal de confirmação de ações críticas
├── layouts/
│   ├── DashboardLayout.jsx    # Layout principal: Sidebar + Topbar + Outlet
│   └── AuthLayout.jsx         # Layout limpo para login
├── pages/
│   ├── LoginPage.jsx          # Autenticação
│   ├── DashboardHome.jsx      # Visão geral com gráficos e KPIs
│   ├── PatientsPage.jsx       # CRUD de pacientes + upload de documentos
│   ├── DoctorsPage.jsx        # CRUD de médicos + escalas de horários
│   ├── SchedulesPage.jsx      # Calendário de agendamentos (react-big-calendar)
│   ├── RecordsPage.jsx        # Prontuários eletrônicos
│   ├── FinancialPage.jsx      # Controle financeiro com gráficos
│   ├── UsersPage.jsx          # Gestão de usuários do sistema
│   ├── SettingsPage.jsx       # Configurações da clínica
│   └── AdminCompaniesPage.jsx # Painel Super Admin: gestão de tenants
├── services/
│   └── kentroService.js       # Integração WhatsApp (Kentro API)
├── context/                   # Contextos React globais
├── App.jsx                    # Rotas + Guards de acesso
└── index.css                  # Design system (tokens CSS + Tailwind)
```

---

## 🔐 Autenticação e Autorização

O sistema utiliza **JWT (JSON Web Tokens)** para autenticação stateless.

### Fluxo de Login
1. Usuário envia `email` + `password` para `POST /login`
2. Backend valida credenciais, verifica se a **company está ativa** (`status = true`)
3. Retorna um JWT assinado com: `id`, `email`, `role`, `company_id`, `is_super_admin`
4. Frontend armazena o token no `localStorage` e o envia em toda requisição via header `Authorization: Bearer <token>`

### Guards de Rota (Frontend)
| Guard | Proteção |
|---|---|
| `PrivateRoute` | Redireciona para `/login` se não houver token |
| `SuperAdminRoute` | Redireciona para `/home` se não for super admin |
| `RoleBasedRedirect` | Super admins vão para `/admin/clinicas`; demais vão para `/home` |

### Roles de Usuário (Backend)
| Role | Acesso |
|---|---|
| `ADMIN` | Gestão completa da clínica |
| `SUPPORT` | Suporte interno |
| `RECEPTIONIST` | Agendamentos e pacientes |
| `USER` | Acesso básico |
| `is_super_admin` | Acesso global — gerencia todas as clínicas |

---

## 🧩 Funcionalidades por Módulo

### 🏠 Dashboard
- KPIs: total de pacientes, agendamentos do dia, receita do mês, médicos ativos
- Gráficos de agendamentos por período e receita mensal
- Próximos agendamentos do dia

### 👤 Pacientes
- Cadastro completo (dados pessoais, contato, endereço)
- Upload e visualização de documentos (exames, laudos)
- Busca por nome, e-mail ou CPF

### 👨‍⚕️ Médicos
- Cadastro com especialidade, CRM e cor personalizada no calendário
- Gerenciamento de escalas de horários por médico
- Busca por nome, especialidade ou CRM

### 📅 Agendamentos
- Calendário visual por dia/semana/mês (`react-big-calendar`)
- Criação de consultas vinculadas a paciente + médico
- Envio de notificação automática via **WhatsApp (Kentro)**
- Filtro por médico e status

### 📋 Prontuários
- Registro eletrônico por paciente/consulta
- Campos de anamnese, diagnóstico e prescrição
- Exportação em PDF (`jsPDF + html2canvas`)

### 💰 Financeiro
- Registro de receitas e despesas
- Gráficos de evolução financeira
- Filtro por período, tipo e status de pagamento
- Busca por descrição ou paciente

### ⚙️ Usuários do Sistema
- Cadastro de usuários com definição de role
- Visibilidade restrita por `company_id`
- Busca por nome ou e-mail

### 🏢 Super Admin — Gestão de Clínicas
- Listagem e criação de tenants (clínicas)
- Ativação / Suspensão de clínicas (bloqueia login dos usuários do tenant)
- Acesso exclusivo via `is_super_admin = true`

---

## ⚙️ Variáveis de Ambiente

### Backend (`.env`)
```env
PORT=3333
DB_HOST=<host-rds>
DB_PORT=5432
DB_USER=<usuario>
DB_PASSWORD=<senha>
DB_NAME=<banco>
JWT_SECRET=<chave-secreta>
KENTRO_API_KEY=<chave-kentro>
KENTRO_INSTANCE=<instancia-kentro>
```

### Frontend (`.env`)
```env
VITE_API_URL=https://<seu-app>.onrender.com
```

---

## 🖥️ Rodando Localmente

### Frontend
```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build
```

### Backend
```bash
npm install
npx sequelize-cli db:migrate
npm run dev  # ou: pm2 start src/server.js
```

---

## 📌 Observações
- O isolamento de dados por `company_id` é aplicado em **todos** os controllers do backend.
- A suspensão de uma clínica (`status = false`) impede o login de **todos os usuários** daquela clínica.
- As notificações via WhatsApp são enviadas automaticamente na criação de agendamentos, utilizando o número cadastrado no perfil do paciente.
