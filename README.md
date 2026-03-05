# Sistema de Agendamento (Frontend)

Este é o projeto frontend do **Sisagendamento**, construído usando [React](https://react.dev/) e a ferramenta de build rápida [Vite](https://vitejs.dev/). Usa também **Tailwind CSS** para estilização. 

---

## 🚀 Como Hospedar (Fazer Deploy)

Para colocar essa aplicação no ar, como é uma "Single Page Application" (SPA) estática construída via Vite, o processo de hospedagem se resume basicamente a **gerar os arquivos de otimização (Build) e enviá-los para um servidor de arquivos estáticos**.

Abaixo estão os guias para os principais serviços modernos e também para servidores genéricos:

### Opção 1: Serviço de Hospedagem Front-end Moderno (Vercel ou Netlify) - *Recomendado*

São plataformas gratuitas e integradas nativamente com o Github, sendo a forma mais rápida e robusta.

**Usando a Vercel:**
1. Crie uma conta no [Vercel](https://vercel.com/) (geralmente logando com seu GitHub).
2. Tenha certeza de que essa pasta (seu backend e frontend) está **versionada no GitHub** num repositório.
3. Clique em **"Add New Project"** no painel da Vercel.
4. Conecte sua conta do GitHub e importe o repositório deste projeto.
5. Se for um monorepo (painel da Vercel pedir "Root Directory"), certifique-se de escolher a pasta `sisagendamento-react` (onde o Vite está).
6. A Vercel detectará automaticamente que é um projeto **Vite**.
7. Preencha ou modifique as Variáveis de Ambiente (`Environment Variables`) se você estiver usando um servidor backend externo:
   - _Nome:_ `VITE_API_URL` (ou o nome que você usa no seu axios config)
   - _Valor:_ `https://sua-api.com.br/api`
8. Clique em **Deploy**. Quando terminar, você receberá um link automático `*.vercel.app` super rápido!

**Usando o Netlify:**
O processo é identico ao da Vercel:
1. Vá até o [Netlify](https://www.netlify.com/), logue com o GitHub.
2. Na página de Sites, clique em **Add new site > Import an existing project**.
3. Selecione o seu projeto/repositório e defina o *Base directory* para o Frontend.
4. As configurações de Build (_Build command: `npm run build`_ e _Publish directory: `dist`_) serão lidas automaticamente.
5. Adicione as variáveis de ambiente em "Environment Variables" apontando pra sua API em produção e clique em **Deploy Site**.

---

### Opção 2: Servidor Convencional CPanel, Hostgator, Apache ou Nginx (FTP ou VPS)

Se você alugou um VPS, Nginx, ou hospeda via CPanel (Locaweb, Hostgator, etc.), precisa transpilar o código localmente e enviar os arquivos "mortos":

1. No terminal do seu computador (VS Code), dentro da pasta deste projeto frontend, feche o servidor que estiver ligado.
2. Caso tenha variáveis de conexão local (Ex. `http://localhost:3333` em seu `axiosConfig.js`), substitua previamente pela URL online oficial do seu Backend na nuvem.
3. Rode o comando de Construção de Emprateleiramento Otimizado:
   ```bash
   npm run build
   ```
4. Repare que o sistema gerou uma pasta nova chamada **`dist/`** no diretório do projeto. Todos os arquivos React, Babel e Vite foram esmagados e comprimidos em pequenos arquivos `.html`, `.js` e `.css` otimizados e minificados! **É APENAS o conteúdo de DENTRO dessa pasta que vai para o servidor!**
5. Pegue **exclusivamente os arquivos de dentro da pasta `dist/`**, zip se necessário, ou envie-os por **FTP/FileZilla** diretamente para a pasta principal pública do seu domínio web no Hostgator/cPanel (geralmente uma pasta chamada `public_html/` ou `www/`).
6. **Atenção (Rotas "Not Found"):** Por ser uma aplicação do tipo SPA em React, se a pessoa tentar dar refresh manual (`F5`) ou digitar direto a rota `/agendamento` no navegador, o servidor Apache/Nginx não achará fisicamente esse diretório e te devolverá `Erro 404`.  
   Para consertar isso, basta criar configurar um pequeno arquivo na mesma raiz onde você soltou os arquivos para redirecionar **toda requisição morta diretamente pro seu `index.html`**:
   - **Se for Apache/Cpanel**, crie um arquivo chamado `.htaccess` na raiz com o seguinte bloco:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteRule . /index.html [L]
     </IfModule>
     ```
   - **Se for Nginx (em um VPS Linux)**, inclua essa instrução no `location /` no Bloco do seu Servidor:
     ```nginx
     location / {
       try_files $uri $uri/ /index.html;
     }
     ```

Pronto. O projeto de frente estará funcionando na nuvem. Lembre-se que **o frontend só funcionará corretamente se a sua API Backend em Node também estiver com deploy feito, respondendo e liberada num IP online público!**
