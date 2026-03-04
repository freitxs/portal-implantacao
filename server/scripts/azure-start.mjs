import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const distEntry = resolve(projectRoot, "dist", "index.js");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function runInstallDependencies() {
  console.log("[startup] Instalando dependências de produção...");

  const result = spawnSync(
    npmCommand,
    ["ci", "--omit=dev", "--no-audit", "--no-fund"],
    {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
    }
  );

  if (result.status !== 0) {
    console.error("[startup] ✗ Falha ao instalar dependências!");
    process.exit(result.status ?? 1);
  }
  
  console.log("[startup] ✓ Dependências instaladas");
}

function ensureDependencies() {
  try {
    require.resolve("express");
    console.log("[startup] ✓ Dependências encontradas");
  } catch {
    runInstallDependencies();
  }
}

function ensureBuildOutput() {
  if (existsSync(distEntry)) {
    console.log("[startup] ✓ Build encontrado");
    return;
  }

  console.error("[startup] ✗ Arquivo dist/index.js não encontrado");
  console.error("[startup] Compile o projeto: npm run build");
  process.exit(1);
}

async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (err) => {
      resolve(err.code === "EADDRINUSE");
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port, "::"); // IPv6
  });
}

async function killProcessesOnPort(port) {
  try {
    if (process.platform === "win32") {
      execSync(`netstat -ano | findstr :${port} | findstr LISTENING && taskkill /F /PID [PID]`, {
        stdio: "ignore",
      });
    } else {
      // Linux/macOS - força matar tudo na porta
      execSync(`lsof -ti:${port} | xargs kill -9`, {
        stdio: "ignore",
        shell: true,
      });
    }
  } catch {
    // Silenciosamente ignora
  }
}

function startServer() {
  const preferredPort = parseInt(process.env.PORT || "4000", 10);

  (async () => {
    console.log(`[startup] Verificando porta ${preferredPort}...`);

    // Matar processos anteriores na porta
    await killProcessesOnPort(preferredPort);
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verificar se a porta está livre
    const inUse = await isPortInUse(preferredPort);
    if (inUse) {
      console.warn(`[startup] ⚠️  Porta ${preferredPort} ainda em uso, aguardando liberação...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("[startup] ✓ Iniciando API com PM2...");

    const child = spawn(npmCommand, ["run", "start:prod"], {
      cwd: projectRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || "production",
      },
    });

    child.on("exit", (code) => {
      process.exit(code ?? 0);
    });

    child.on("error", (error) => {
      console.error("[startup] ✗ Erro ao iniciar:", error.message);
      process.exit(1);
    });
  })();
}

console.log("[startup] === Iniciando Application Bootstrap ===");
ensureDependencies();
ensureBuildOutput();
startServer();
