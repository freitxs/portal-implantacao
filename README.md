# Onboarding / Implantação — Sistema de Precificação (Wizard)

Monorepo com **Front-end (React + TypeScript + MUI)** e **Back-end (Node.js + TypeScript + Express + Prisma + SQLite)**.

## Requisitos
- Node.js 18+ (recomendado 20+)
- npm (ou pnpm/yarn)

## Estrutura
- `server/` API REST + JWT + Prisma (SQLite) + Uploads (local)
- `client/` React (Vite) + MUI + Wizard (Stepper) + Admin

---

## 1) Setup do Back-end

```bash
cd server
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

A API subirá em: `http://localhost:4000`

### Contas seed
- **Admin**
  - e-mail: `admin@demo.com`
  - senha: `Admin@123`
- **Cliente**
  - e-mail: `cliente@demo.com`
  - senha: `Cliente@123`

Uploads ficam em `server/uploads/`.

---

## 2) Setup do Front-end

Em outro terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

O app subirá em: `http://localhost:5173`

---

## 3) Fluxos principais

### Cliente
- Login
- Wizard em etapas com **auto-save** por etapa
- Upload de **Contrato** e **Proposta**
- Revisão e envio (status vira **ENVIADO**)
- Tela **Meus Formulários** (continuar rascunho / ver resumo)
- Geração de **Resumo em PDF** (client-side)

### Admin
- Login
- Tela **Formulários recebidos** com filtros e busca
- Detalhe com dados completos + links para download de anexos
- Exportação CSV (listagem e/ou formulário)

---

## Variáveis de ambiente

### server/.env
- `DATABASE_URL="file:./dev.db"`
- `JWT_ACCESS_SECRET="..."`
- `JWT_REFRESH_SECRET="..."`
- `CORS_ORIGIN="http://localhost:5173"`
- `UPLOAD_DIR="./uploads"`
- `PORT=4000`

### client/.env
- `VITE_API_URL="http://localhost:4000"`

---

## Endpoints principais (resumo)

### Auth
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

### Usuários (admin)
- `POST /api/admin/users` (cria cliente/admin)

### Formulários
- `GET  /api/forms/my` (cliente)
- `POST /api/forms` (cria ou retorna rascunho ativo)
- `GET  /api/forms/:id`
- `PUT  /api/forms/:id/step/:stepIndex` (auto-save por etapa)
- `POST /api/forms/:id/submit` (envio final)

### Uploads
- `POST /api/forms/:id/uploads/:type` (CONTRATO|PROPOSTA)
- `DELETE /api/forms/:id/uploads/:type`
- `GET /api/uploads/:uploadId/download` (download protegido)

### Admin
- `GET /api/admin/forms` (filtros)
- `GET /api/admin/forms/:id`
- `GET /api/admin/forms.csv` (export listagem)
- `GET /api/admin/forms/:id.csv` (export formulário)

---

## Observações
- Multi-tenant simples: o cliente só acessa **seus** formulários; admin vê todos.
- Upload local com estrutura preparada para plugar S3 no futuro (camada `storage`).
- Validação em tempo real no front com `react-hook-form` + `zod`.
- Acessibilidade: labels, foco visível, navegação por teclado, alerts/toasts.
