/*
 * ============================================================
 * server/static.ts — Servidor de Arquivos Estáticos (Produção)
 * ============================================================
 *
 * Este arquivo é responsável por servir o frontend buildado
 * quando a aplicação está em modo de PRODUÇÃO.
 *
 * Quando você roda `npm run build`, o Vite compila todos os
 * arquivos TypeScript/React em HTML, CSS e JavaScript puro,
 * e os coloca na pasta dist/public.
 *
 * Em produção, o servidor Express serve esses arquivos
 * estáticos diretamente, sem o Vite intermediando.
 *
 * Conceito de SPA (Single Page Application):
 *   O React é uma SPA — existe apenas um index.html, e o
 *   roteamento acontece no JavaScript do navegador.
 *   Por isso, qualquer URL (ex: /anual, /protocolo) deve
 *   retornar o mesmo index.html, e o React Router cuida do resto.
 * ============================================================
 */

// express: usado para a função express.static() que serve arquivos
import express, { type Express } from "express";

// fs (file system): módulo nativo do Node.js para verificar se arquivos/pastas existem
import fs from "fs";

// path: módulo nativo do Node.js para manipular caminhos de arquivos de forma cross-platform
import path from "path";

/*
 * serveStatic(app) — Configura o Express para servir o frontend em produção
 * -------------------------------------------------------
 * Parâmetros:
 *   app → a instância do Express criada em server/index.ts
 *
 * Funcionamento:
 *   1. Resolve o caminho absoluto para a pasta dist/public
 *   2. Verifica se a pasta existe (se não, o build não foi rodado)
 *   3. Serve todos os arquivos estáticos (JS, CSS, imagens) dessa pasta
 *   4. Qualquer rota desconhecida retorna o index.html (necessário para SPA)
 */
export function serveStatic(app: Express) {
  // __dirname → pasta atual do arquivo compilado (dist/)
  // path.resolve junta os segmentos de forma segura independente do OS
  const distPath = path.resolve(__dirname, "public");

  // Verifica se a pasta dist/public existe antes de tentar servi-la
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve todos os arquivos da pasta dist/public como arquivos estáticos
  // Ex: GET /assets/index.js → retorna o arquivo dist/public/assets/index.js
  app.use(express.static(distPath));

  // Fallback para SPA: qualquer rota não encontrada retorna o index.html
  // O React Router no navegador então interpreta a URL e mostra a página correta
  // Ex: GET /anual → não existe arquivo, mas retorna index.html → React Router mostra DashboardAnual
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
