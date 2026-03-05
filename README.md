# 📅 SisAgenda — Frontend

Sistema de agendamento desenvolvido com **React + Vite**.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Git](https://git-scm.com/)
- npm (já vem junto com o Node.js)

---

## ⚙️ Configuração do Ambiente

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/front-sisagenda.git
cd front-sisagenda
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no `.env.example`:

```bash
cp .env.example .env
```

Edite o `.env` e defina a URL do backend:

```env
VITE_API_BASE_URL=https://users-postgres.onrender.com
```

> ⚠️ **Importante:** Sem essa variável configurada, o projeto tentará se conectar ao `http://localhost:3333` (backend local). Para se comunicar com o backend de produção/testes, a variável **deve** estar definida.

### 3. Instale as dependências

```bash
npm install
```

> Se receber erro de política de execução no PowerShell, execute antes:
>
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

## 🚀 Rodando Localmente

```bash
npm run dev
```

O projeto estará disponível em: **http://localhost:5173**

---

## 🏗️ Gerando Build de Produção

```bash
npm run build
```

Os arquivos finais serão gerados na pasta `dist/`.

Para testar o build localmente antes de subir:

```bash
npm run preview
```

---

## ☁️ Deploy Gratuito para Testes

### Opção 1 — [Vercel](https://vercel.com) ⭐ (Recomendado)

A Vercel é a plataforma mais simples para projetos React/Vite e tem plano gratuito generoso.

**Passo a passo:**

1. Acesse [vercel.com](https://vercel.com) e crie uma conta (pode usar o GitHub)
2. Clique em **"Add New Project"**
3. Importe o repositório do GitHub
4. Na etapa de configuração, defina a variável de ambiente:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://users-postgres.onrender.com`
5. Clique em **"Deploy"**

A Vercel detecta automaticamente que é um projeto Vite e configura tudo.

---

### Opção 2 — [Netlify](https://netlify.com)

1. Acesse [netlify.com](https://netlify.com) e crie uma conta
2. Clique em **"Add new site" → "Import an existing project"**
3. Conecte ao GitHub e selecione o repositório
4. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Vá em **Site settings → Environment variables** e adicione:
   - `VITE_API_BASE_URL` = `https://users-postgres.onrender.com`
6. Clique em **"Deploy site"**

---

### Opção 3 — [GitHub Pages](https://pages.github.com) (com limitações)

> ⚠️ O GitHub Pages **não suporta variáveis de ambiente** em tempo de build sem um pipeline CI/CD. Recomendamos usar Vercel ou Netlify.

---

## 🔌 Integração com o Backend

O projeto já está preparado para consumir a API REST do backend. A URL base é configurada via variável de ambiente.

### Como funciona

O arquivo `src/api/axiosConfig.js` centraliza todas as requisições HTTP:

```js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3333";
axios.defaults.baseURL = API_BASE_URL;
```

- Se `VITE_API_BASE_URL` estiver definida no `.env`, ela será usada.
- Caso contrário, o fallback é `http://localhost:3333` (backend local).

### O que você precisa alterar/configurar

| Situação                 | O que fazer                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| Desenvolvimento local    | Criar `.env` com `VITE_API_BASE_URL=https://users-postgres.onrender.com` |
| Deploy na Vercel/Netlify | Adicionar `VITE_API_BASE_URL` nas variáveis de ambiente da plataforma    |
| Backend local rodando    | Deixar `.env` vazio ou usar `VITE_API_BASE_URL=http://localhost:3333`    |

### ⚠️ Atenção — CORS

Para que o frontend consiga fazer requisições ao backend, o servidor em `https://users-postgres.onrender.com` precisa permitir a origem do seu frontend (domínio da Vercel/Netlify).

Se receber erros de **CORS** no console do navegador, no backend (Node.js/Express) deve estar configurado algo como:

```js
app.use(
  cors({
    origin: ["https://seu-app.vercel.app", "http://localhost:5173"],
  }),
);
```

---

## 📁 Estrutura do Projeto

```
front-sisagenda/
├── src/
│   ├── api/
│   │   └── axiosConfig.js   # Configuração global do Axios + interceptors JWT
│   ├── components/          # Componentes reutilizáveis
│   ├── pages/               # Páginas da aplicação
│   ├── layouts/             # Layouts base
│   └── assets/              # Imagens e recursos estáticos
├── .env                     # Variáveis de ambiente (NÃO subir para o Git)
├── .env.example             # Modelo das variáveis necessárias
├── vite.config.js           # Configuração do Vite
└── package.json
```

---

## 🔒 Segurança

- O arquivo `.env` está listado no `.gitignore` e **nunca deve ser commitado**.
- O token JWT é armazenado no `localStorage` e injetado automaticamente em todas as requisições pelo interceptor do Axios.
- Se o token expirar (resposta 401), o usuário é redirecionado automaticamente para `/login`.

---

## 🛠️ Scripts Disponíveis

| Comando           | Descrição                                 |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Inicia o servidor de desenvolvimento      |
| `npm run build`   | Gera o build de produção na pasta `dist/` |
| `npm run preview` | Serve o build localmente para testes      |
| `npm run lint`    | Executa o ESLint para verificar o código  |
