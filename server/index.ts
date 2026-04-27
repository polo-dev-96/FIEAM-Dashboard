/*
 * ============================================================
 * server/index.ts — Ponto de entrada do servidor (Backend)
 * ============================================================
 *
 * Este é o arquivo PRINCIPAL do servidor Node.js/Express.
 * Assim como main.tsx é o início do frontend, este arquivo
 * é o início do backend.
 *
 * Responsabilidades:
 *   1. Criar a aplicação Express (framework web para Node.js)
 *   2. Configurar middlewares globais (JSON, logs, erros)
 *   3. Registrar todas as rotas da API (/api/...)
 *   4. Servir os arquivos do frontend (em produção)
 *   5. Iniciar o servidor HTTP na porta configurada
 *
 * Fluxo de uma requisição:
 *   Navegador → req HTTP → middleware de log → rota da API
 *   → controller → banco de dados → resposta JSON → navegador
 * ============================================================
 */

// dotenv precisa ser configurado PRIMEIRO, antes de qualquer import que use process.env
import dotenv from "dotenv";
dotenv.config();

// express: framework web para Node.js que facilita criar servidores HTTP
// Request, Response, NextFunction: tipos TypeScript para os parâmetros das rotas
import express, { type Request, Response, NextFunction } from "express";

// registerRoutes: função que cadastra todas as rotas /api/* no servidor (ver routes.ts)
import { registerRoutes } from "./routes";

// serveStatic: serve os arquivos HTML/CSS/JS do frontend em produção (ver static.ts)
import { serveStatic } from "./static";

// createServer: cria um servidor HTTP nativo do Node.js
// Necessário para WebSockets (socket.io) funcionar junto com Express
import { createServer } from "http";

// Cria a aplicação Express
const app = express();

// Envolve o Express em um servidor HTTP nativo
const httpServer = createServer(app);

// Middleware: permite o Express ler body de requisições em formato JSON
// Sem isso, req.body seria undefined em requisições POST/PUT
app.use(express.json());

// Middleware: permite ler body em formato URL encoded (formulários HTML tradicionais)
// extended: false → usa a biblioteca nativa do Node (querystring) em vez de qs
app.use(express.urlencoded({ extended: false }));

/*
 * log(message, source?) — Função de logging com horário formatado
 * -------------------------------------------------------
 * Exibe mensagens no terminal com hora e a fonte do log.
 * Exemplo de saída: "14:32:05 [express] GET /api/stats 200 in 45ms"
 *
 * source → identifica de onde vem o log. Padrão: "express"
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/*
 * Middleware de log de requisições HTTP
 * -------------------------------------------------------
 * Intercepta TODAS as requisições que começam com /api
 * e registra no terminal: método, rota, status e tempo de resposta.
 *
 * Como funciona:
 *   1. Salva o horário de início (Date.now())
 *   2. "Monkey-patches" o res.json() para capturar a resposta
 *   3. Quando a resposta termina (evento "finish"), calcula a duração
 *      e chama log() com as informações
 *   4. Chama next() para continuar para o próximo middleware/rota
 */
app.use((req, res, next) => {
  const start = Date.now(); // horário de início em milissegundos
  const path = req.path;   // ex: "/api/stats"
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Sobrescreve temporariamente res.json para capturar o conteúdo da resposta
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson; // guarda a resposta
    return originalResJson.apply(res, [bodyJson, ...args]); // chama o original
  };

  // Quando a resposta terminar de ser enviada ao cliente:
  res.on("finish", () => {
    const duration = Date.now() - start; // tempo total em ms
    if (path.startsWith("/api")) {       // só loga rotas da API
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // Adiciona os primeiros 200 chars da resposta (para debug)
        logLine += ` :: ${JSON.stringify(capturedJsonResponse).substring(0, 200)}`;
      }
      log(logLine);
    }
  });

  next(); // passa para o próximo middleware ou rota
});

/*
 * Bloco async autoexecutável (IIFE)
 * -------------------------------------------------------
 * Usa async/await para registrar rotas e iniciar o servidor.
 * É uma IIFE (Immediately Invoked Function Expression):
 * uma função que se chama sozinha assim que o arquivo carrega.
 * Necessária porque não podemos usar await diretamente no nível raiz.
 */
(async () => {
  // Registra todas as rotas /api/* definidas em routes.ts
  await registerRoutes(httpServer, app);

  /*
   * Middleware global de tratamento de erros
   * -------------------------------------------------------
   * Captura qualquer erro lançado dentro das rotas.
   * Retorna uma resposta JSON com status e mensagem de erro.
   * O parâmetro extra "err" diferencia este middleware dos normais.
   */
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500; // usa o status do erro ou 500
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    // Se a resposta já foi enviada (ex: streaming), delega ao Express
    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  /*
   * Modo de execução: produção vs desenvolvimento
   * -------------------------------------------------------
   * Em produção (NODE_ENV=production):
   *   → Serve os arquivos estáticos buildados do frontend (dist/public)
   *
   * Em desenvolvimento:
   *   → Usa o Vite como middleware para hot-reload (HMR)
   *     O Vite transforma os arquivos TypeScript/React em tempo real
   */
  if (process.env.NODE_ENV === "production") {
    serveStatic(app); // serve dist/public (frontend buildado)
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app); // liga o Vite dev server
  }

  /*
   * Inicializa o servidor HTTP na porta configurada
   * -------------------------------------------------------
   * host: "0.0.0.0" → aceita conexões de qualquer IP (não apenas localhost)
   * Importante para funcionar em ambientes de deploy (VPS, Docker, etc.)
   */
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0", // escuta em todas as interfaces de rede
    },
    () => {
      log(`Dashboard Polo BI rodando na porta ${port}`);
    },
  );
})();
