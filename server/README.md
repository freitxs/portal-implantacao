# Server (Node.js + Express + Prisma + SQLite)

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Uploads: `./uploads`

## Deploy no Azure App Service (Linux)

### ⚠️ Implementado conforme Microsoft Docs

O projeto agora segue as [recomendações oficiais da Microsoft](https://learn.microsoft.com/pt-br/azure/app-service/configure-language-nodejs):

- **PM2 em produção**: `npm run start:prod` executa com `pm2 start --no-daemon`
- **Porta dinâmica**: Escuta `process.env.PORT` (Azure seta automaticamente)
- **Bootstrap automático**: `npm start` instala dependências se necessário
- **Build automático**: Oryx executa `npm run build:azure` durante deploy

### Checklist de deploy

1. Defina Node LTS no App Service (20.x ou 22.x).
2. Faça build antes do deploy:

```bash
npm ci
npm run build
```

3. Garanta que `package.json`, `package-lock.json`, `dist/` e `prisma/schema.prisma` vão no artefato publicado.
4. Startup command do App Service: `npm start`.

> Se o deploy estiver em modo read-only (`WEBSITE_RUN_FROM_PACKAGE=1`), publique o app já com dependências de produção instaladas no processo de build/pipeline.

### Automatizar deploy com script PowerShell

Execute o script de deploy automaticamente:

```bash
# Sem parâmetros (usa defaults)
.\scripts\deploy-azure.ps1

# Com parâmetros personalizados
.\scripts\deploy-azure.ps1 -ResourceGroup seu-rg -AppServiceName seu-app-service
```

O script:
1. Compila TypeScript (`npm run build`)
2. Empacota `package.json`, `package-lock.json`, `dist/`, `prisma/` e `.env`
3. Executa `az webapp deploy` no App Service

> **Pré-requisitos:** Azure CLI (`az`) instalado e autenticado com `az login`

### Configurar variáveis de ambiente no Azure App Service

> ⚠️ **NÃO publique `.env` com segredos em produção!** Configure variáveis via Azure Portal ou CLI.

**Opção 1: Script PowerShell (recomendado)**

Depois do deploy, execute o script que lê seu `.env` local e configura tudo no Azure:

```bash
# Edite .env com seus valores
# Em seguida, execute:
.\scripts\config-azure-env.ps1
```

Este script:
1. Lê as variáveis do `.env` local
2. Mostra quais serão configuradas (com valores sensíveis mascarados)
3. Envia tudo para o Azure App Service
4. Reinicia a aplicação automaticamente

**Opção 2: Comando Azure CLI manual**

```bash
az webapp config appsettings set \
  --resource-group production-saas \
  --name portal-implantacao-backend \
  --settings \
    DATABASE_URL="sqlserver://..." \
    JWT_ACCESS_SECRET="seu-jwt-access-secret" \
    JWT_REFRESH_SECRET="seu-jwt-refresh-secret" \
    CORS_ORIGIN="https://seu-frontend.azurewebsites.net" \
    UPLOAD_DIR="./uploads" \
    PORT=8080
```

**Opção 3: Azure Portal**

1. Acesse https://portal.azure.com
2. Vá para "portal-implantacao-backend" → "Configuration" → "Application settings"
3. Clique em "New application setting" e adicione manualmente:

| Chave | Valor | Obrigatório |
|-------|-------|-----------|
| `DATABASE_URL` | Connection string (SQL Server, PostgreSQL, etc.) | ✓ Sim |
| `JWT_ACCESS_SECRET` | Token secret (mín. 10 caracteres) | ✓ Sim |
| `JWT_REFRESH_SECRET` | Refresh token secret (mín. 10 caracteres) | ✓ Sim |
| `CORS_ORIGIN` | URL do frontend | ✓ Sim |
| `UPLOAD_DIR` | `./uploads` | ✓ Sim |
| `PORT` | `8080` | ✗ Não (padrão: 4000) |

4. Clique em "Save" para aplicar
5. App Service será reiniciado automaticamente
