/*
 * ============================================================
 * server/routes.ts — Todas as rotas da API do backend
 * ============================================================
 *
 * Este arquivo define TODAS as rotas HTTP da aplicação (o "backbone" da API).
 * Cada rota é uma função que:
 *   1. Recebe uma requisição HTTP (req) do frontend
 *   2. Executa uma query SQL no MySQL via pool de conexões
 *   3. Retorna os dados em formato JSON (res.json())
 *
 * Rotas disponíveis:
 *   POST /api/login              → Autenticação de usuários
 *   GET  /api/casas              → Lista de "casas" (canais de atendimento) distintos
 *   GET  /api/stats              → Estatísticas gerais (principal rota do dashboard)
 *   GET  /api/stats/anual        → Dados anuais agregados por mês
 *   GET  /api/protocolo/:id      → Busca um atendimento por número de protocolo
 *   GET  /api/telefone/:numero   → Busca atendimentos por número de telefone
 *   GET  /api/openai/stats       → Estatísticas do banco OpenAI (senai_pf)
 *   GET  /api/patrocinados/stats → Estatísticas de patrocinadores
 *   GET  /api/export/excel       → Exportação de dados em planilha Excel
 *
 * Conceito de Query Parameters:
 *   Parâmetros passados na URL após "?": /api/stats?startDate=2026-01-01&endDate=2026-01-31
 *   Acessados via req.query.startDate, req.query.endDate
 *
 * Conceito de async/await:
 *   Operações de banco de dados são assíncronas (demoram um tempo para responder).
 *   async/await permite escrever esse código de forma sequencial e legível.
 *   try/catch captura erros e retorna status 500 (Internal Server Error) ao frontend.
 * ============================================================
 */

// Express: tipos para a aplicação web (Express) e servidor HTTP
import type { Express } from "express";
import type { Server } from "http";

// pool: conexão principal com o banco de dados MySQL
// TABLE_NAME: nome da tabela configurado no .env (padrão: base_senai)
// poolOpenAI: pool separado para o banco senai_pf (dashboard OpenAI)
import pool, { TABLE_NAME, poolOpenAI } from "./db";

// RowDataPacket: tipo do mysql2 para linhas retornadas por queries
import type { RowDataPacket } from "mysql2";

// ExcelJS: biblioteca para criar planilhas Excel (.xlsx) programaticamente
import ExcelJS from "exceljs";

// bcryptjs: biblioteca para verificar senhas com hash (segurança)
// bcrypt.compare(senhaDigitada, hashSalvo) → retorna true se a senha estiver correta
import bcrypt from "bcryptjs";

/*
 * registerRoutes(httpServer, app) — Registra todas as rotas na aplicação Express
 * -------------------------------------------------------
 * Chamada em server/index.ts durante a inicialização.
 * Recebe a instância do Express e registra cada rota com app.get() ou app.post().
 */
export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  /*
   * POST /api/login — Autentica um usuário pelo email e senha
   * -------------------------------------------------------
   * Recebe: { email: string, password: string } no body da requisição
   *
   * Processo:
   *   1. Valida que email e senha foram fornecidos
   *   2. Busca o usuário no banco pelo email (somente usuários ativos: ativo = 1)
   *   3. Usa bcrypt.compare() para verificar a senha contra o hash salvo
   *      (bcrypt é usado para NUNCA salvar a senha em texto puro no banco)
   *   4. Atualiza data_atualizacao com o horário do último acesso
   *   5. Gera um token base64 simples: "id:email:timestamp"
   *   6. Retorna o token + dados do usuário para o frontend
   *
   * Erros possíveis:
   *   400 → email ou senha não fornecidos
   *   401 → usuário não encontrado OU senha incorreta (mesma mensagem por segurança)
   *   500 → erro interno do servidor
   */
  // POST /api/login - Autenticação com banco de dados (tabela usuarios)
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    try {
      // Busca usuário pelo email, excluindo inativos (ativo = 1)
      // rotas_permitidas: JSON com as rotas individuais do usuário (pode ser NULL)
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, email, senha_hash, nivel_acesso, rotas_permitidas FROM usuarios WHERE email = ? AND ativo = 1",
        [email]
      );

      // Se não encontrou nenhum usuário com esse email
      if (rows.length === 0) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const user = rows[0];
      // bcrypt.compare verifica se a senha digitada bate com o hash salvo no banco
      const senhaCorreta = await bcrypt.compare(password, user.senha_hash);

      if (!senhaCorreta) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Atualiza data_atualizacao com o horário do último acesso
      await pool.query("UPDATE usuarios SET data_atualizacao = NOW() WHERE id = ?", [user.id]);

      // Gera token simples em base64: "id:email:timestamp" → codificado em base64
      // Nota: em produção real, seria recomendado usar JWT (jsonwebtoken)
      const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString("base64");

      // Parseia rotas_permitidas: MySQL retorna JSON como string, converte para array
      let rotasPermitidas: string[] | null = null;
      if (user.rotas_permitidas) {
        try {
          rotasPermitidas = typeof user.rotas_permitidas === "string"
            ? JSON.parse(user.rotas_permitidas)
            : user.rotas_permitidas;
        } catch {
          rotasPermitidas = null;
        }
      }

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nivel_acesso: user.nivel_acesso,
          rotas_permitidas: rotasPermitidas,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ─── Rotas de Administração de Usuários ────────────────────────────────────
  //
  // Todas as rotas abaixo exigem que o token pertença ao admin master.
  // O token base64 tem o formato "id:email:timestamp", decodificado para verificar o email.
  //
  // Helper: decodifica o token e retorna o email do usuário autenticado
  function getEmailFromToken(authHeader?: string): string | null {
    if (!authHeader?.startsWith("Bearer ")) return null;
    try {
      const token = authHeader.slice(7);
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      // formato: "id:email:timestamp"
      const parts = decoded.split(":");
      // email pode conter ":", por isso junta do índice 1 até o penúltimo
      if (parts.length < 3) return null;
      return parts.slice(1, -1).join(":");
    } catch {
      return null;
    }
  }

  const ADMIN_EMAIL = "admin@polotelecom.com.br";

  // Helper: verifica se a requisição vem do admin master
  function isAdminRequest(authHeader?: string): boolean {
    const email = getEmailFromToken(authHeader);
    return email === ADMIN_EMAIL;
  }

  /*
   * GET /api/admin/users — Lista todos os usuários (exceto o próprio admin)
   * Retorna: id, email, nivel_acesso, rotas_permitidas, ativo, data_criacao
   */
  app.get("/api/admin/users", async (req, res) => {
    if (!isAdminRequest(req.headers.authorization)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT id, email, nivel_acesso, rotas_permitidas, ativo, data_criacao
         FROM usuarios
         WHERE email != ?
         ORDER BY data_criacao DESC`,
        [ADMIN_EMAIL]
      );
      // Parseia rotas_permitidas de cada usuário
      const users = rows.map((u) => ({
        ...u,
        rotas_permitidas: u.rotas_permitidas
          ? (typeof u.rotas_permitidas === "string" ? JSON.parse(u.rotas_permitidas) : u.rotas_permitidas)
          : null,
      }));
      return res.json(users);
    } catch (error) {
      console.error("Erro ao listar usuários:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  /*
   * POST /api/admin/users — Cria um novo usuário
   * Body: { email, password, rotas_permitidas: string[] }
   */
  app.post("/api/admin/users", async (req, res) => {
    if (!isAdminRequest(req.headers.authorization)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { email, password, rotas_permitidas } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }
    if (email === ADMIN_EMAIL) {
      return res.status(400).json({ message: "Não é possível criar este usuário" });
    }
    try {
      // Verifica se o email já existe (ativo ou inativo)
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT id FROM usuarios WHERE email = ?",
        [email]
      );
      if (existing.length > 0) {
        return res.status(409).json({ message: "Email já cadastrado" });
      }
      const senhaHash = await bcrypt.hash(password, 10);
      const rotasJson = rotas_permitidas ? JSON.stringify(rotas_permitidas) : null;
      await pool.query(
        `INSERT INTO usuarios (email, senha_hash, nivel_acesso, rotas_permitidas, ativo)
         VALUES (?, ?, 'visualizador', ?, 1)`,
        [email, senhaHash, rotasJson]
      );
      return res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  /*
   * PATCH /api/admin/users/:id/permissions — Atualiza as rotas permitidas de um usuário
   * Body: { rotas_permitidas: string[] }
   */
  app.patch("/api/admin/users/:id/permissions", async (req, res) => {
    if (!isAdminRequest(req.headers.authorization)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { id } = req.params;
    const { rotas_permitidas } = req.body;
    try {
      // Impede que o admin altere a si mesmo
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT email FROM usuarios WHERE id = ?",
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado" });
      if (rows[0].email === ADMIN_EMAIL) return res.status(400).json({ message: "Não é possível alterar o admin master" });

      const rotasJson = rotas_permitidas ? JSON.stringify(rotas_permitidas) : null;
      await pool.query(
        "UPDATE usuarios SET rotas_permitidas = ?, data_atualizacao = NOW() WHERE id = ?",
        [rotasJson, id]
      );
      return res.json({ message: "Permissões atualizadas com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar permissões:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  /*
   * DELETE /api/admin/users/:id — Desativa um usuário (ativo = 0, não apaga do banco)
   */
  app.delete("/api/admin/users/:id", async (req, res) => {
    if (!isAdminRequest(req.headers.authorization)) {
      return res.status(403).json({ message: "Acesso negado" });
    }
    const { id } = req.params;
    try {
      // Impede que o admin se delete
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT email FROM usuarios WHERE id = ?",
        [id]
      );
      if (rows.length === 0) return res.status(404).json({ message: "Usuário não encontrado" });
      if (rows[0].email === ADMIN_EMAIL) return res.status(400).json({ message: "Não é possível remover o admin master" });

      await pool.query(
        "UPDATE usuarios SET ativo = 0, data_atualizacao = NOW() WHERE id = ?",
        [id]
      );
      return res.json({ message: "Usuário removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover usuário:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ─── Fim das Rotas de Administração ─────────────────────────────────────────

  /*
   * GET /api/casas — Lista todos os canais de atendimento distintos
   * -------------------------------------------------------
   * Retorna: string[] com os nomes de todas as "casas" no banco
   *
   * COALESCE(NULLIF(TRIM(casa), ''), 'Falta de Interação'):
   *   - TRIM() remove espaços extras
   *   - NULLIF(..., '') converte string vazia para NULL
   *   - COALESCE(..., 'Falta de Interação') substitui NULL pelo texto padrão
   *   Resultado: casas sem valor recebem o nome "Falta de Interação"
   *
   * Usado para popular os dropdowns de filtro de entidade/equipe no dashboard.
   */
  // GET /api/stats - Metricas agregadas do dashboard
  // Supports optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  // GET /api/casas - Lista de casas distintas
  app.get("/api/casas", async (_req, res) => {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT DISTINCT COALESCE(NULLIF(TRIM(casa), ''), 'Falta de Interação') AS nome
        FROM \`${TABLE_NAME}\`
        WHERE \`data e hora de fim\` IS NOT NULL
        ORDER BY nome ASC
      `);
      res.json(rows.map((r) => r.nome)); // extrai apenas o campo "nome" de cada linha
    } catch (error) {
      console.error("Erro ao buscar casas:", error);
      res.status(500).json({ message: "Erro ao buscar casas" });
    }
  });

  /*
   * GET /api/stats — Estatísticas gerais do dashboard (rota principal)
   * -------------------------------------------------------
   * A rota MAIS USADA do sistema. Retorna todos os dados da Visão Geral.
   *
   * Query Parameters (opcionais):
   *   startDate  → data inicial do filtro (YYYY-MM-DD)
   *   endDate    → data final do filtro   (YYYY-MM-DD)
   *   casa       → array de casas para filtrar (pode passar ?casa=X&casa=Y)
   *   allOpcoes  → "true" para retornar TODAS as opções selecionadas
   *   allCasas   → "true" para retornar TODAS as casas (sem LIMIT 10)
   *
   * Dados retornados (objeto JSON):
   *   totais        → { total, hoje, semana, mes, duracaoMedia }
   *   porCanal      → atendimentos agrupados por canal (WhatsApp, site, etc.)
   *   porCasa       → atendimentos agrupados por casa/equipe
   *   porResumo     → assuntos das conversas (para o Top 20)
   *   porAssunto    → alias de porResumo (usado em DashboardAnual)
   *   porOpcao      → opções selecionadas pelos usuários (menu de opções)
   *   porHora       → distribuição de atendimentos por hora do dia
   *   porDia        → distribuição de atendimentos por dia da semana
   *   tendencia     → atendimentos dos últimos 30 dias (para gráfico de linha)
   *
   * Técnica de parametrização SQL (?) :
   *   Usamos "?" como placeholder para evitar SQL Injection.
   *   Os valores reais são passados no array filterParams separado.
   *   Ex: WHERE `casa` IN (?, ?) → mysql2 substitui os "?" com segurança
   */
  app.get("/api/stats", async (req, res) => {
    try {
      const conn = await pool.getConnection();

      try {
        const { startDate, endDate, casa, allOpcoes, allCasas } = req.query;

        // Build date filter clause
        // Quando startDate e endDate são fornecidos, adiciona cláusula WHERE de data
        let dateFilter = "";
        const dateParams: string[] = [];
        if (startDate && endDate) {
          dateFilter = `AND DATE(\`data e hora de fim\`) >= ? AND DATE(\`data e hora de fim\`) <= ?`;
          dateParams.push(String(startDate), String(endDate));
        }

        // Build casa filter clause (supports multiple values)
        // Monta a cláusula IN (?,?,?) para filtrar por múltiplas casas
        // "Falta de Interação" é tratada especialmente (casa vazia/null no banco)
        let casaFilter = "";
        const casaParams: string[] = [];
        if (casa) {
          const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
          const filtered = casaArr.filter(c => c !== 'Todas');
          if (filtered.length > 0) {
            const hasFalta = filtered.includes('Falta de Interação');
            const realCasas = filtered.filter(c => c !== 'Falta de Interação');
            const conditions: string[] = [];
            if (realCasas.length > 0) {
              conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
              casaParams.push(...realCasas);
            }
            if (hasFalta) {
              conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`); // captura casas vazias
            }
            casaFilter = `AND (${conditions.join(' OR ')})`;
          }
        }

        const filterParams = [...dateParams, ...casaParams];

        // Total de atendimentos filtrado pelo período (contando protocolos distintos)
        const [totalPeriodo] = await conn.query<RowDataPacket[]>(`
          SELECT COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
        `, filterParams);

        // hoje / semana / mes — always use current real date, independent of selected date range
        const [totalsHoje] = await conn.query<RowDataPacket[]>(`
          SELECT
            COUNT(DISTINCT CASE WHEN DATE(\`data e hora de fim\`) = CURDATE() THEN protocolo END) AS hoje,
            COUNT(DISTINCT CASE WHEN YEARWEEK(\`data e hora de fim\`, 1) = YEARWEEK(CURDATE(), 1) THEN protocolo END) AS semana,
            COUNT(DISTINCT CASE WHEN YEAR(\`data e hora de fim\`) = YEAR(CURDATE()) AND MONTH(\`data e hora de fim\`) = MONTH(CURDATE()) THEN protocolo END) AS mes
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${casaFilter}
        `, casaParams);

        // Duracao media em minutos
        const [avgDuration] = await conn.query<RowDataPacket[]>(`
          SELECT
            ROUND(AVG(TIMESTAMPDIFF(MINUTE, \`data e hora de inicio\`, \`data e hora de fim\`)), 1) AS duracao_media
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            AND \`data e hora de inicio\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
        `, filterParams);

        // Atendimentos por canal (protocolos distintos)
        const [porCanal] = await conn.query<RowDataPacket[]>(`
          SELECT
            canal AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
          GROUP BY canal
          ORDER BY total DESC
        `, filterParams);

        // Atendimentos por casa (protocolos distintos) — COALESCE empty/null to 'Falta de Interação'
        const porCasaLimit = allCasas === 'true' ? '' : 'LIMIT 10';
        const [porCasa] = await conn.query<RowDataPacket[]>(`
          SELECT
            COALESCE(NULLIF(TRIM(casa), ''), 'Falta de Interação') AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
          GROUP BY nome
          ORDER BY total DESC
          ${porCasaLimit}
        `, filterParams);

        // Atendimentos por resumo da conversa (protocolos distintos)
        const [porResumo] = await conn.query<RowDataPacket[]>(`
          SELECT
            \`resumo da conversa\` AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            AND \`resumo da conversa\` IS NOT NULL
            AND \`resumo da conversa\` != ''
            ${dateFilter}
            ${casaFilter}
          GROUP BY \`resumo da conversa\`
          ORDER BY total DESC
        `, filterParams);

        // Atendimentos por opcaoselecionada
        const opcaoFilterClause = allOpcoes === 'true'
          ? `AND TRIM(opcaoselecionada) != '' AND opcaoselecionada IS NOT NULL`
          : `AND TRIM(opcaoselecionada) IN (
              'DENÚNCIAS/CANAL DE ÉTICA E INTEGRIDADE',
              'ELOGIOS/ RECLAMAÇÕES/ SUGESTÕES',
              'INFORMAÇÕES LAI – LEI 12.527/11'
            )`;
        const [porOpcaoSelecionada] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(opcaoselecionada) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${opcaoFilterClause}
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(opcaoselecionada)
          ORDER BY total DESC
        `, filterParams);

        // Atendimentos por patrocinados
        const [porPatrocinados] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(patrocinados) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            AND patrocinados IS NOT NULL
            AND TRIM(patrocinados) != ''
            AND TRIM(patrocinados) != 'false'
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(patrocinados)
          ORDER BY total DESC
        `, filterParams);

        // Volume ao longo do tempo (filtered by date range or last 30 days)
        let timelineFilter = dateFilter;
        const timelineParams = [...dateParams, ...casaParams];
        if (!startDate || !endDate) {
          timelineFilter = `AND \`data e hora de fim\` >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`;
        }

        const [timeline] = await conn.query<RowDataPacket[]>(`
          SELECT
            DATE(\`data e hora de fim\`) AS data,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${timelineFilter}
            ${casaFilter}
          GROUP BY DATE(\`data e hora de fim\`)
          ORDER BY data ASC
        `, timelineParams);

        conn.release();

        res.json({
          totais: {
            total: totalPeriodo[0]?.total || 0,
            hoje: totalsHoje[0]?.hoje || 0,
            semana: totalsHoje[0]?.semana || 0,
            mes: totalsHoje[0]?.mes || 0,
          },
          duracaoMedia: avgDuration[0]?.duracao_media || 0,
          porCanal: porCanal || [],
          porCasa: porCasa || [],
          porResumo: porResumo || [],
          porOpcaoSelecionada: porOpcaoSelecionada || [],
          porPatrocinados: porPatrocinados || [],
          timeline: timeline || [],
        });
      } catch (queryErr) {
        conn.release();
        throw queryErr;
      }
    } catch (error) {
      console.error("Erro ao buscar stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatisticas do dashboard" });
    }
  });

  /*
   * GET /api/recentes — Últimos atendimentos finalizados (sem duplicatas de protocolo)
   * -------------------------------------------------------
   * Retorna os atendimentos mais recentes para exibir na tabela da Visão Geral.
   *
   * Técnica de deduplication com INNER JOIN:
   *   Um mesmo protocolo pode ter múltiplas linhas no banco (histórico de mensagens).
   *   O INNER JOIN com subquery garante que pegamos apenas o registro de maior id
   *   (o mais recente) de cada protocolo, evitando linhas duplicadas.
   *
   *   Subquery: SELECT MAX(id) AS max_id ... GROUP BY protocolo
   *   → Para cada protocolo, pega o id máximo (registro mais recente)
   *   INNER JOIN: filtra a tabela principal para manter só esses ids
   */
  // GET /api/recentes - Ultimos atendimentos finalizados (sem duplicatas de protocolo)
  // Supports optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
  app.get("/api/recentes", async (req, res) => {
    try {
      const { startDate, endDate, casa } = req.query;

      let dateFilter = "";
      const dateParams: string[] = [];
      if (startDate && endDate) {
        dateFilter = `AND DATE(\`data e hora de fim\`) >= ? AND DATE(\`data e hora de fim\`) <= ?`;
        dateParams.push(String(startDate), String(endDate));
      }

      // Build casa filter clause (supports multiple values)
      let casaFilter = "";
      const casaParams: string[] = [];
      if (casa) {
        const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
        const filtered = casaArr.filter(c => c !== 'Todas');
        if (filtered.length > 0) {
          const hasFalta = filtered.includes('Falta de Interação');
          const realCasas = filtered.filter(c => c !== 'Falta de Interação');
          const conditions: string[] = [];
          if (realCasas.length > 0) {
            conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
            casaParams.push(...realCasas);
          }
          if (hasFalta) {
            conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
          }
          casaFilter = `AND (${conditions.join(' OR ')})`;
        }
      }

      const filterParams = [...dateParams, ...casaParams];

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          t.id,
          t.contato,
          t.identificador,
          t.protocolo,
          t.canal,
          t.\`data e hora de inicio\` AS dataHoraInicio,
          t.\`data e hora de fim\` AS dataHoraFim,
          t.\`tipo de canal\` AS tipoCanal,
          t.\`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(t.casa), ''), 'Falta de Interação') AS casa
        FROM \`${TABLE_NAME}\` t
        INNER JOIN (
          SELECT MAX(id) AS max_id
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
          GROUP BY protocolo
        ) latest ON t.id = latest.max_id
        ORDER BY t.\`data e hora de fim\` DESC
      `, filterParams);

      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar recentes:", error);
      res.status(500).json({ message: "Erro ao buscar atendimentos recentes" });
    }
  });

  /*
   * GET /api/protocolo/:protocolo — Busca um atendimento pelo número de protocolo
   * -------------------------------------------------------
   * Usado pela página SearchProtocol.tsx.
   *
   * :protocolo → é um "route param" (parâmetro na URL)
   *   Ex: GET /api/protocolo/20240001 → req.params.protocolo = "20240001"
   *
   * LIMIT 1 garante que retornamos apenas 1 registro (o mais recente, ORDER BY id DESC).
   *
   * Retorna 404 se o protocolo não existir no banco.
   */
  // GET /api/protocolo/:protocolo - Busca por protocolo (sem duplicatas)
  app.get("/api/protocolo/:protocolo", async (req, res) => {
    try {
      const { protocolo } = req.params;

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          id,
          contato,
          identificador,
          protocolo,
          canal,
          \`data e hora de inicio\` AS dataHoraInicio,
          \`data e hora de fim\` AS dataHoraFim,
          \`tipo de canal\` AS tipoCanal,
          \`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(casa), ''), 'Falta de Interação') AS casa
        FROM \`${TABLE_NAME}\`
        WHERE protocolo = ?
        ORDER BY id DESC
        LIMIT 1
      `, [protocolo]);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Protocolo nao encontrado" });
      }

      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar protocolo:", error);
      res.status(500).json({ message: "Erro ao buscar protocolo" });
    }
  });

  /*
   * GET /api/telefone/:telefone — Busca atendimentos por número de telefone
   * -------------------------------------------------------
   * Usado pela página SearchPhone.tsx.
   *
   * Usa LIKE `%${telefone}%` (busca parcial) no campo `identificador`.
   * Isso permite buscar mesmo que o número esteja formatado de forma diferente.
   * Ex: buscar "92999" vai encontrar "(92) 99999-9999" e "92999999999"
   *
   * Retorna TODOS os atendimentos desse telefone (sem dedup), ordenados por data.
   * Retorna 404 se nenhum atendimento for encontrado.
   */
  // GET /api/telefone/:telefone — Search all atendimentos by phone number
  app.get("/api/telefone/:telefone", async (req, res) => {
    try {
      const { telefone } = req.params;
      const { startDate, endDate } = req.query;

      let dateFilter = "";
      const params: any[] = [`%${telefone}%`];

      if (startDate && endDate) {
        dateFilter = " AND DATE(`data e hora de fim`) BETWEEN ? AND ?";
        params.push(startDate, endDate);
      }

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          id,
          contato,
          identificador,
          protocolo,
          canal,
          \`data e hora de inicio\` AS dataHoraInicio,
          \`data e hora de fim\` AS dataHoraFim,
          \`tipo de canal\` AS tipoCanal,
          \`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(casa), ''), 'Falta de Interação') AS casa
        FROM \`${TABLE_NAME}\`
        WHERE identificador LIKE ?${dateFilter}
        ORDER BY \`data e hora de fim\` DESC
      `, params);

      if (rows.length === 0) {
        return res.status(404).json({ message: "Telefone não encontrado" });
      }

      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar telefone:", error);
      res.status(500).json({ message: "Erro ao buscar telefone" });
    }
  });

  /*
   * GET /api/export-xlsx — Exporta atendimentos como planilha Excel (.xlsx)
   * -------------------------------------------------------
   * Gera e faz o download de uma planilha Excel com os atendimentos filtrados.
   * Aceita os mesmos parâmetros de filtro de /api/stats (startDate, endDate, casa).
   *
   * Processo:
   *   1. Busca os atendimentos do banco (com dedup por protocolo via INNER JOIN)
   *   2. Cria uma planilha Excel com ExcelJS
   *   3. Define cabeçalhos e formata as colunas
   *   4. Adiciona cada atendimento como uma linha
   *   5. Envia o arquivo como stream HTTP com header de download
   *
   * O header Content-Disposition: attachment; filename="...xlsx" instrui
   * o navegador a baixar o arquivo em vez de exibi-lo.
   */
  // GET /api/export-xlsx — Export atendimentos as XLSX download
  app.get("/api/export-xlsx", async (req, res) => {
    try {
      const { startDate, endDate, casa } = req.query;

      let dateFilter = "";
      const dateParams: string[] = [];
      if (startDate && endDate) {
        dateFilter = `AND DATE(\`data e hora de fim\`) >= ? AND DATE(\`data e hora de fim\`) <= ?`;
        dateParams.push(String(startDate), String(endDate));
      }

      let casaFilter = "";
      const casaParams: string[] = [];
      if (casa) {
        const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
        const filtered = casaArr.filter(c => c !== 'Todas');
        if (filtered.length > 0) {
          const hasFalta = filtered.includes('Falta de Interação');
          const realCasas = filtered.filter(c => c !== 'Falta de Interação');
          const conditions: string[] = [];
          if (realCasas.length > 0) {
            conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
            casaParams.push(...realCasas);
          }
          if (hasFalta) {
            conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
          }
          casaFilter = `AND (${conditions.join(' OR ')})`;
        }
      }

      const filterParams = [...dateParams, ...casaParams];

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          t.protocolo,
          t.contato,
          t.identificador,
          t.canal,
          t.\`tipo de canal\` AS tipoCanal,
          t.\`data e hora de inicio\` AS dataHoraInicio,
          t.\`data e hora de fim\` AS dataHoraFim,
          t.\`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(t.casa), ''), 'Falta de Interação') AS casa
        FROM \`${TABLE_NAME}\` t
        INNER JOIN (
          SELECT MAX(id) AS max_id
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
          GROUP BY protocolo
        ) latest ON t.id = latest.max_id
        ORDER BY t.\`data e hora de fim\` DESC
      `, filterParams);

      // Build XLSX with exceljs
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "FIEAM Dashboard";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Atendimentos");

      // Define columns
      sheet.columns = [
        { header: "Protocolo", key: "protocolo", width: 18 },
        { header: "Contato", key: "contato", width: 25 },
        { header: "Identificador", key: "identificador", width: 18 },
        { header: "Canal", key: "canal", width: 22 },
        { header: "Tipo de Canal", key: "tipoCanal", width: 20 },
        { header: "Data/Hora Início", key: "dataHoraInicio", width: 20 },
        { header: "Data/Hora Fim", key: "dataHoraFim", width: 20 },
        { header: "Resumo da Conversa", key: "resumoConversa", width: 35 },
        { header: "Casa", key: "casa", width: 22 },
      ];

      // Style header row
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0077C0" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF003366" } },
        };
      });
      headerRow.height = 28;

      // Add data rows
      for (const row of rows) {
        sheet.addRow({
          protocolo: row.protocolo || "",
          contato: row.contato || "",
          identificador: row.identificador || "",
          canal: row.canal || "",
          tipoCanal: row.tipoCanal || "",
          dataHoraInicio: row.dataHoraInicio ? new Date(row.dataHoraInicio).toLocaleString("pt-BR") : "",
          dataHoraFim: row.dataHoraFim ? new Date(row.dataHoraFim).toLocaleString("pt-BR") : "",
          resumoConversa: row.resumoConversa || "",
          casa: row.casa || "",
        });
      }

      // Auto-filter
      sheet.autoFilter = { from: "A1", to: `I${rows.length + 1}` };

      // Send as XLSX
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="relatorio_atendimentos_${startDate || "all"}_${endDate || "all"}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Erro ao exportar XLSX:", error);
      res.status(500).json({ message: "Erro ao exportar XLSX" });
    }
  });

  /*
   * GET /api/anual-stats — Estatísticas anuais para o Dashboard Anual
   * -------------------------------------------------------
   * Usado pela página DashboardAnual.tsx.
   *
   * Query Parameters:
   *   year  → ano selecionado (padrão: ano atual)
   *   month → mês(es) selecionados (array: ?month=1&month=2)
   *   casa  → filtro de casas (mesmo padrão de /api/stats)
   *
   * Dados retornados:
   *   evolucao   → atendimentos por mês agrupados por canal (gráfico de linha/barra)
   *   porOrigem  → distribuição por tipo de canal (WhatsApp, site, etc.)
   *   porCasa    → top casas/equipes no período
   *   porAssunto → top assuntos das conversas (para o ranking horizontal)
   *   totais     → totais do período selecionado
   */
  // GET /api/anual-stats - Stats for the Annual Dashboard
  app.get("/api/anual-stats", async (req, res) => {
    try {
      const conn = await pool.getConnection();
      try {
        const { year, month, casa } = req.query;
        const selectedYear = year ? String(year) : String(new Date().getFullYear());
        const selectedMonth = month ? (Array.isArray(month) ? month.map(String) : [String(month)]) : null;

        // Build casa filter
        let casaFilter = "";
        const casaParams: string[] = [];
        if (casa) {
          const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
          const filtered = casaArr.filter(c => c !== 'Todas');
          if (filtered.length > 0) {
            const hasFalta = filtered.includes('Falta de Interação');
            const realCasas = filtered.filter(c => c !== 'Falta de Interação');
            const conditions: string[] = [];
            if (realCasas.length > 0) {
              conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
              casaParams.push(...realCasas);
            }
            if (hasFalta) {
              conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
            }
            casaFilter = `AND (${conditions.join(' OR ')})`;
          }
        }

        const yearFilter = `AND YEAR(\`data e hora de fim\`) = ?`;
        const monthFilter = selectedMonth && selectedMonth.length > 0
          ? `AND MONTH(\`data e hora de fim\`) IN (${selectedMonth.map(() => '?').join(',')})`
          : '';
        const dateParams = selectedMonth && selectedMonth.length > 0
          ? [selectedYear, ...selectedMonth]
          : [selectedYear];

        // 1. Evolução dos Atendimentos por Mês agrupado por Canal
        // MONTH() extrai o número do mês (1=Jan, ..., 12=Dez) da data
        const [evolucao] = await conn.query<RowDataPacket[]>(`
          SELECT
            MONTH(\`data e hora de fim\`) AS mes,
            canal,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${yearFilter}
            ${monthFilter}
            ${casaFilter}
          GROUP BY MONTH(\`data e hora de fim\`), canal
          ORDER BY mes ASC, canal ASC
        `, [...dateParams, ...casaParams]);

        // 2. Atendimentos por Origem (tipo de canal) — deduplicado por protocolo
        // MIN(id) + GROUP BY protocolo garante que cada protocolo é contado uma vez
        const [porOrigem] = await conn.query<RowDataPacket[]>(`
          SELECT
            COALESCE(NULLIF(TRIM(t.\`tipo de canal\`), ''), 'Não informado') AS nome,
            COUNT(*) AS total
          FROM \`${TABLE_NAME}\` t
          INNER JOIN (
            SELECT MIN(id) AS min_id
            FROM \`${TABLE_NAME}\`
            WHERE \`data e hora de fim\` IS NOT NULL
              ${yearFilter}
              ${monthFilter}
              ${casaFilter}
            GROUP BY protocolo
          ) latest ON t.id = latest.min_id
          GROUP BY nome
          ORDER BY total DESC
        `, [...dateParams, ...casaParams]);

        // 3. Atendimentos por Assunto (resumo da conversa)
        const [porAssunto] = await conn.query<RowDataPacket[]>(`
          SELECT
            \`resumo da conversa\` AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            AND \`resumo da conversa\` IS NOT NULL
            AND \`resumo da conversa\` != ''
            ${yearFilter}
            ${monthFilter}
            ${casaFilter}
          GROUP BY \`resumo da conversa\`
          ORDER BY total DESC
        `, [...dateParams, ...casaParams]);

        // 4. Dentro e Fora do Prazo (24h SLA)
        const [prazo] = await conn.query<RowDataPacket[]>(`
          SELECT
            SUM(CASE WHEN TIMESTAMPDIFF(HOUR, \`data e hora de inicio\`, \`data e hora de fim\`) <= 24 THEN 1 ELSE 0 END) AS dentro,
            SUM(CASE WHEN TIMESTAMPDIFF(HOUR, \`data e hora de inicio\`, \`data e hora de fim\`) > 24 THEN 1 ELSE 0 END) AS fora
          FROM (
            SELECT protocolo, MIN(\`data e hora de inicio\`) AS \`data e hora de inicio\`, MAX(\`data e hora de fim\`) AS \`data e hora de fim\`
            FROM \`${TABLE_NAME}\`
            WHERE \`data e hora de fim\` IS NOT NULL
              AND \`data e hora de inicio\` IS NOT NULL
              ${yearFilter}
              ${monthFilter}
              ${casaFilter}
            GROUP BY protocolo
          ) sub
        `, [...dateParams, ...casaParams]);

        conn.release();

        res.json({
          evolucao: evolucao || [],
          porOrigem: porOrigem || [],
          porAssunto: porAssunto || [],
          prazo: {
            dentro: prazo[0]?.dentro || 0,
            fora: prazo[0]?.fora || 0,
          },
        });
      } catch (queryErr) {
        conn.release();
        throw queryErr;
      }
    } catch (error) {
      console.error("Erro ao buscar stats anuais:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas anuais" });
    }
  });

  // GET /api/anual-drilldown - Drill-down for annual dashboard charts
  app.get("/api/anual-drilldown", async (req, res) => {
    try {
      const { year, month, casa, tipo, valor } = req.query;
      const selectedYear = year ? String(year) : String(new Date().getFullYear());
      const selectedMonth = month ? (Array.isArray(month) ? month.map(String) : [String(month)]) : null;

      // Build casa filter
      let casaFilter = "";
      const casaParams: string[] = [];
      if (casa) {
        const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
        const filtered = casaArr.filter(c => c !== 'Todas');
        if (filtered.length > 0) {
          const hasFalta = filtered.includes('Falta de Interação');
          const realCasas = filtered.filter(c => c !== 'Falta de Interação');
          const conditions: string[] = [];
          if (realCasas.length > 0) {
            conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
            casaParams.push(...realCasas);
          }
          if (hasFalta) {
            conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
          }
          casaFilter = `AND (${conditions.join(' OR ')})`;
        }
      }

      const yearFilter = `AND YEAR(\`data e hora de fim\`) = ?`;
      const monthFilter = selectedMonth && selectedMonth.length > 0
        ? `AND MONTH(\`data e hora de fim\`) IN (${selectedMonth.map(() => '?').join(',')})`
        : '';
      const dateParams = selectedMonth && selectedMonth.length > 0
        ? [selectedYear, ...selectedMonth]
        : [selectedYear];

      let extraFilter = "";
      const extraParams: string[] = [];
      const tipoStr = String(tipo || "");
      const valorStr = String(valor || "");

      if (tipoStr === "origem") {
        if (valorStr === "Não informado") {
          extraFilter = `AND (TRIM(\`tipo de canal\`) = '' OR \`tipo de canal\` IS NULL)`;
        } else {
          extraFilter = `AND TRIM(\`tipo de canal\`) = ?`;
          extraParams.push(valorStr);
        }
      } else if (tipoStr === "assunto") {
        const assuntoValues = valorStr.split('|||').map(s => s.trim()).filter(Boolean);
        if (assuntoValues.length > 0) {
          extraFilter = `AND \`resumo da conversa\` IN (${assuntoValues.map(() => '?').join(',')})`;
          extraParams.push(...assuntoValues);
        }
      } else if (tipoStr === "prazo") {
        if (valorStr === "dentro") {
          extraFilter = `AND TIMESTAMPDIFF(HOUR, t.\`data e hora de inicio\`, t.\`data e hora de fim\`) <= 24`;
        } else {
          extraFilter = `AND TIMESTAMPDIFF(HOUR, t.\`data e hora de inicio\`, t.\`data e hora de fim\`) > 24`;
        }
      }

      const allParams = [...dateParams, ...casaParams, ...extraParams];

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          t.protocolo,
          t.contato,
          t.identificador,
          t.canal,
          t.\`tipo de canal\` AS tipoCanal,
          t.\`data e hora de inicio\` AS dataHoraInicio,
          t.\`data e hora de fim\` AS dataHoraFim,
          t.\`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(t.casa), ''), 'Falta de Interação') AS casa
        FROM \`${TABLE_NAME}\` t
        INNER JOIN (
          SELECT MAX(id) AS max_id
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${yearFilter}
            ${monthFilter}
            ${casaFilter}
          GROUP BY protocolo
        ) latest ON t.id = latest.max_id
        WHERE 1=1
          ${extraFilter}
        ORDER BY t.\`data e hora de fim\` DESC
      `, allParams);

      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar drilldown:", error);
      res.status(500).json({ message: "Erro ao buscar dados detalhados" });
    }
  });

  /*
   * GET /api/opcao-drilldown — Detalhe dos atendimentos por opção selecionada
   * -------------------------------------------------------
   * Quando o usuário clica em uma barra do gráfico de Opções Selecionadas,
   * esta rota retorna os atendimentos individuais daquela opção.
   * Permite "drill-down" (aprofundamento) nos dados do gráfico.
   */
  // GET /api/opcao-drilldown - Drill-down for opcaoselecionada chart (Overview)
  app.get("/api/opcao-drilldown", async (req, res) => {
    try {
      const { startDate, endDate, casa, opcao } = req.query;

      let dateFilter = "";
      const dateParams: string[] = [];
      if (startDate && endDate) {
        dateFilter = `AND DATE(\`data e hora de fim\`) >= ? AND DATE(\`data e hora de fim\`) <= ?`;
        dateParams.push(String(startDate), String(endDate));
      }

      let casaFilter = "";
      const casaParams: string[] = [];
      if (casa) {
        const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
        const filtered = casaArr.filter(c => c !== 'Todas');
        if (filtered.length > 0) {
          const hasFalta = filtered.includes('Falta de Interação');
          const realCasas = filtered.filter(c => c !== 'Falta de Interação');
          const conditions: string[] = [];
          if (realCasas.length > 0) {
            conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
            casaParams.push(...realCasas);
          }
          if (hasFalta) {
            conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
          }
          casaFilter = `AND (${conditions.join(' OR ')})`;
        }
      }

      const opcaoArr = opcao ? (Array.isArray(opcao) ? opcao.map(String) : [String(opcao)]) : [];
      const opcaoFilter = opcaoArr.length > 0 ? `AND TRIM(opcaoselecionada) IN (${opcaoArr.map(() => '?').join(',')})` : '';
      const opcaoParams = opcaoArr;

      const allParams = [...dateParams, ...casaParams, ...dateParams, ...casaParams, ...opcaoParams];

      const [rows] = await pool.query<RowDataPacket[]>(`
        SELECT
          t.protocolo,
          t.contato,
          t.identificador,
          t.canal,
          t.\`tipo de canal\` AS tipoCanal,
          t.\`data e hora de inicio\` AS dataHoraInicio,
          t.\`data e hora de fim\` AS dataHoraFim,
          t.\`resumo da conversa\` AS resumoConversa,
          COALESCE(NULLIF(TRIM(t.casa), ''), 'Falta de Interação') AS casa,
          TRIM(t.opcaoselecionada) AS opcaoSelecionada
        FROM \`${TABLE_NAME}\` t
        INNER JOIN (
          SELECT MAX(id) AS max_id
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            ${dateFilter}
            ${casaFilter}
          GROUP BY protocolo
        ) latest ON t.id = latest.max_id
        WHERE 1=1
          ${dateFilter}
          ${casaFilter}
          ${opcaoFilter}
        ORDER BY t.\`data e hora de fim\` DESC
      `, allParams);

      res.json(rows);
    } catch (error) {
      console.error("Erro ao buscar opcao-drilldown:", error);
      res.status(500).json({ message: "Erro ao buscar dados detalhados" });
    }
  });

  /*
   * ─── Rotas do Dashboard OpenAI (banco senai_pf, tabela base_openai) ────────────────────────
   * Essas rotas usam `poolOpenAI` (conexão com banco separado senai_pf)
   * em vez do `pool` principal.
   *
   * Desafios especiais do banco OpenAI:
   *   - start_time: campo varchar no formato "dd-MM-yyyy" (não é DATE real)
   *     → Convertemos com STR_TO_DATE(start_time, '%d-%m-%Y')
   *   - value: campo varchar com prefixo "$" (ex: "$0.00123")
   *     → Removemos com REPLACE(value, '$', '') e convertemos com CAST...AS DECIMAL
   *   - Linhas inválidas: start_time = 'Invalid DateTime' ou value = ''
   *     → Filtramos com OPENAI_VALID_ROW para excluir essas linhas
   *
   * Constantes SQL reutilizadas em todas as queries OpenAI:
   *   OPENAI_PARSED_DATE  → expressão SQL que converte start_time para DATE real
   *   OPENAI_PARSED_VALUE → expressão SQL que converte value para DECIMAL (número)
   *   OPENAI_VALID_ROW    → cláusula WHERE que filtra linhas válidas
   */
  // ─── OpenAI Dashboard Routes (base_openai in senai_pf) ────────────────────────
  // Nota: start_time é varchar no formato "dd-MM-yyyy", value é varchar com prefixo "$"
  // Usamos STR_TO_DATE e REPLACE para converter corretamente.

  const OPENAI_PARSED_DATE = `STR_TO_DATE(start_time, '%d-%m-%Y')`;
  const OPENAI_PARSED_VALUE = `CAST(REPLACE(value, '$', '') AS DECIMAL(20,6))`;
  const OPENAI_VALID_ROW = `start_time IS NOT NULL AND TRIM(start_time) != '' AND start_time != 'Invalid DateTime' AND value IS NOT NULL AND TRIM(value) != ''`;

  /*
   * GET /api/openai-projects — Lista os nomes de projetos OpenAI distintos
   * -------------------------------------------------------
   * Usado para popular o dropdown de filtro de projeto no Dashboard OpenAI.
   * Consulta a tabela base_openai do banco senai_pf via poolOpenAI.
   */
  // GET /api/openai-projects - Lista de project_name distintos
  app.get("/api/openai-projects", async (_req, res) => {
    try {
      const [rows] = await poolOpenAI.query<RowDataPacket[]>(`
        SELECT DISTINCT TRIM(project_name) AS nome
        FROM base_openai
        WHERE project_name IS NOT NULL AND TRIM(project_name) != ''
        ORDER BY nome ASC
      `);
      res.json(rows.map((r) => r.nome));
    } catch (error) {
      console.error("Erro ao buscar projetos OpenAI:", error);
      res.status(500).json({ message: "Erro ao buscar projetos OpenAI" });
    }
  });

  /*
   * GET /api/openai-stats — Estatísticas de custos/uso da OpenAI
   * -------------------------------------------------------
   * Usado pelo DashboardOpenAI.tsx (acesso exclusivo: master).
   *
   * Query Parameters:
   *   startDate, endDate → período (aplicado sobre start_time convertido)
   *   project            → filtro de projeto (array)
   *
   * Dados retornados:
   *   totalValue  → soma total de custos no período ($)
   *   timeline    → custos por dia (para gráfico de linha)
   *   porProjeto  → distribuição de custos por projeto (para gráfico de pizza)
   */
  // GET /api/openai-stats - Stats do dashboard OpenAI
  app.get("/api/openai-stats", async (req, res) => {
    try {
      const { startDate, endDate, project } = req.query;

      // Build date filter
      let dateFilter = "";
      const dateParams: string[] = [];
      if (startDate && endDate) {
        dateFilter = `AND ${OPENAI_PARSED_DATE} >= ? AND ${OPENAI_PARSED_DATE} <= ?`;
        dateParams.push(String(startDate), String(endDate));
      }

      // Build project filter (supports multiple values)
      let projectFilter = "";
      const projectParams: string[] = [];
      if (project) {
        const projArr = Array.isArray(project) ? project.map(String) : [String(project)];
        if (projArr.length > 0) {
          projectFilter = `AND TRIM(project_name) IN (${projArr.map(() => '?').join(',')})`;
          projectParams.push(...projArr);
        }
      }

      const filterParams = [...dateParams, ...projectParams];

      // 1. Valor total
      const [totalResult] = await poolOpenAI.query<RowDataPacket[]>(`
        SELECT COALESCE(SUM(${OPENAI_PARSED_VALUE}), 0) AS total
        FROM base_openai
        WHERE ${OPENAI_VALID_ROW}
          ${dateFilter}
          ${projectFilter}
      `, filterParams);

      // 2. Volume de Gastos por dia (timeline)
      const [timeline] = await poolOpenAI.query<RowDataPacket[]>(`
        SELECT
          DATE_FORMAT(${OPENAI_PARSED_DATE}, '%Y-%m-%d') AS data,
          SUM(${OPENAI_PARSED_VALUE}) AS total
        FROM base_openai
        WHERE ${OPENAI_VALID_ROW}
          ${dateFilter || `AND ${OPENAI_PARSED_DATE} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`}
          ${projectFilter}
        GROUP BY DATE_FORMAT(${OPENAI_PARSED_DATE}, '%Y-%m-%d')
        ORDER BY data ASC
      `, dateFilter ? filterParams : projectParams);

      // 3. Valores por Unidade (project_name)
      const [porProjeto] = await poolOpenAI.query<RowDataPacket[]>(`
        SELECT
          TRIM(project_name) AS nome,
          SUM(${OPENAI_PARSED_VALUE}) AS total
        FROM base_openai
        WHERE ${OPENAI_VALID_ROW}
          ${dateFilter || `AND ${OPENAI_PARSED_DATE} >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`}
          ${projectFilter}
        GROUP BY nome
        ORDER BY total DESC
      `, dateFilter ? filterParams : projectParams);

      res.json({
        totalValue: parseFloat(totalResult[0]?.total) || 0,
        timeline: (timeline || []).map((r: any) => ({ data: r.data, total: parseFloat(r.total) || 0 })),
        porProjeto: (porProjeto || []).map((r: any) => ({ nome: r.nome, total: parseFloat(r.total) || 0 })),
      });
    } catch (error) {
      console.error("Erro ao buscar stats OpenAI:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas OpenAI" });
    }
  });

  /*
   * GET /api/openai-export-xlsx — Exporta dados OpenAI como planilha Excel
   * -------------------------------------------------------
   * Mesmo padrão de /api/export-xlsx, mas para os dados do banco OpenAI.
   * Aceita parâmetro adicional `moeda` para converter valores de USD para BRL.
   */
  // GET /api/openai-export-xlsx — Export OpenAI data as XLSX
  app.get("/api/openai-export-xlsx", async (req, res) => {
    try {
      const { startDate, endDate, project, moeda } = req.query;

      let dateFilter = "";
      const dateParams: string[] = [];
      if (startDate && endDate) {
        dateFilter = `AND ${OPENAI_PARSED_DATE} >= ? AND ${OPENAI_PARSED_DATE} <= ?`;
        dateParams.push(String(startDate), String(endDate));
      }

      let projectFilter = "";
      const projectParams: string[] = [];
      if (project) {
        const projArr = Array.isArray(project) ? project.map(String) : [String(project)];
        if (projArr.length > 0) {
          projectFilter = `AND TRIM(project_name) IN (${projArr.map(() => '?').join(',')})`;
          projectParams.push(...projArr);
        }
      }

      const filterParams = [...dateParams, ...projectParams];

      const [rows] = await poolOpenAI.query<RowDataPacket[]>(`
        SELECT
          DATE_FORMAT(${OPENAI_PARSED_DATE}, '%Y-%m-%d') AS data,
          TRIM(project_name) AS projeto,
          ${OPENAI_PARSED_VALUE} AS valor
        FROM base_openai
        WHERE ${OPENAI_VALID_ROW}
          ${dateFilter}
          ${projectFilter}
        ORDER BY ${OPENAI_PARSED_DATE} DESC
      `, filterParams);

      // Currency conversion
      const isBRL = String(moeda || "USD") === "BRL";
      let taxaCambio = 1;
      if (isBRL) {
        try {
          const response = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
          const data = await response.json();
          taxaCambio = parseFloat(data.USDBRL?.bid) || 5.0;
        } catch {
          taxaCambio = 5.0;
        }
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "FIEAM Dashboard";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("OpenAI Gastos");

      const simboloMoeda = isBRL ? "R$" : "$";
      sheet.columns = [
        { header: "Data", key: "data", width: 15 },
        { header: "Projeto", key: "projeto", width: 30 },
        { header: `Valor (${simboloMoeda})`, key: "valor", width: 18 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0077C0" } };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = { bottom: { style: "thin", color: { argb: "FF003366" } } };
      });
      headerRow.height = 28;

      for (const row of rows) {
        const rawVal = parseFloat(row.valor) || 0;
        const valorConvertido = isBRL ? rawVal * taxaCambio : rawVal;
        sheet.addRow({
          data: row.data ? new Date(row.data + "T12:00:00").toLocaleDateString("pt-BR") : "",
          projeto: row.projeto || "",
          valor: valorConvertido.toFixed(4),
        });
      }

      sheet.autoFilter = { from: "A1", to: `C${rows.length + 1}` };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="relatorio_openai_${startDate || "all"}_${endDate || "all"}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Erro ao exportar XLSX OpenAI:", error);
      res.status(500).json({ message: "Erro ao exportar XLSX OpenAI" });
    }
  });

  /*
   * GET /api/patrocinados-stats — Estatísticas de atendimentos patrocinados e campanhas
   * -------------------------------------------------------
   * Usado pelo DashboardPatrocinados.tsx (acesso restrito).
   *
   * Regras de negócio:
   *   - Só processa registros onde AMBOS os campos têm valor real:
   *     patrocinados ≠ NULL, '', 'false'
   *     variaveis    ≠ NULL, '', 'false'
   *   - Ignora dados antes de 12/04/2026 (data de início do rastreamento)
   *
   * Classificação por conteúdo do campo `variaveis`:
   *   - Começa com 'PATROCINADO' → categoria Patrocinado
   *   - Começa com 'CAMPANHA'    → categoria Campanha
   *   - Qualquer outro valor     → categoria Outros
   *
   * Dados retornados:
   *   totais             → { totalPatrocinados, totalCampanhas, totalOutros }
   *   rankingPatrocinados → top patrocinadores por volume de atendimentos
   *   rankingCampanhas   → top campanhas por volume de atendimentos
   *   timeline           → evolução temporal dos atendimentos por categoria
   */
  // ─── Dashboard Patrocinados/Campanhas ────────────────────────────
  // Regras:
  //   - Só traz registros onde patrocinados tem valor real (NOT NULL, != '', != 'false')
  //     E variaveis tem valor real (NOT NULL, != '', != 'false')
  //   - Classificação: variaveis começa com 'PATROCINADO' → Patrocinado,
  //     começa com 'CAMPANHA' → Campanha, senão → Outros (usa valor de patrocinados)
  app.get("/api/patrocinados-stats", async (req, res) => {
    try {
      const conn = await pool.getConnection();
      try {
        const { startDate, endDate, casa } = req.query;

        let dateFilter = "";
        const dateParams: string[] = [];
        if (startDate && endDate) {
          dateFilter = `AND DATE(\`data e hora de fim\`) >= ? AND DATE(\`data e hora de fim\`) <= ?`;
          dateParams.push(String(startDate), String(endDate));
        }

        let casaFilter = "";
        const casaParams: string[] = [];
        if (casa) {
          const casaArr = Array.isArray(casa) ? casa.map(String) : [String(casa)];
          const filtered = casaArr.filter(c => c !== 'Todas');
          if (filtered.length > 0) {
            const hasFalta = filtered.includes('Falta de Interação');
            const realCasas = filtered.filter(c => c !== 'Falta de Interação');
            const conditions: string[] = [];
            if (realCasas.length > 0) {
              conditions.push(`TRIM(casa) IN (${realCasas.map(() => '?').join(',')})`);
              casaParams.push(...realCasas);
            }
            if (hasFalta) {
              conditions.push(`(TRIM(casa) = '' OR casa IS NULL)`);
            }
            casaFilter = `AND (${conditions.join(' OR ')})`;
          }
        }

        const filterParams = [...dateParams, ...casaParams];

        // Condição base: ambas colunas com valor real + ignorar dados <= 12/04/2026
        const baseCondition = `
          \`data e hora de fim\` IS NOT NULL
          AND DATE(\`data e hora de fim\`) > '2026-04-12'
          AND patrocinados IS NOT NULL AND TRIM(patrocinados) != '' AND TRIM(patrocinados) != 'false'
          AND variaveis IS NOT NULL AND TRIM(variaveis) != '' AND TRIM(variaveis) != 'false'
        `;

        // Totais por categoria
        const [totais] = await conn.query<RowDataPacket[]>(`
          SELECT
            COUNT(DISTINCT CASE WHEN UPPER(TRIM(variaveis)) LIKE 'PATROCINADO%' THEN protocolo END) AS totalPatrocinados,
            COUNT(DISTINCT CASE WHEN UPPER(TRIM(variaveis)) LIKE 'CAMPANHA%' THEN protocolo END) AS totalCampanhas,
            COUNT(DISTINCT CASE
              WHEN UPPER(TRIM(variaveis)) NOT LIKE 'PATROCINADO%'
               AND UPPER(TRIM(variaveis)) NOT LIKE 'CAMPANHA%'
              THEN protocolo END) AS totalOutros
          FROM \`${TABLE_NAME}\`
          WHERE ${baseCondition}
            ${dateFilter}
            ${casaFilter}
        `, filterParams);

        // Ranking Patrocinados (agrupado por variaveis)
        const [rankingPatrocinados] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(variaveis) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE ${baseCondition}
            AND UPPER(TRIM(variaveis)) LIKE 'PATROCINADO%'
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(variaveis)
          ORDER BY total DESC
        `, filterParams);

        // Ranking Campanhas (agrupado por variaveis)
        const [rankingCampanhas] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(variaveis) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE ${baseCondition}
            AND UPPER(TRIM(variaveis)) LIKE 'CAMPANHA%'
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(variaveis)
          ORDER BY total DESC
        `, filterParams);

        // Ranking Outros (agrupado por patrocinados, já que variaveis não é PATROCINADO nem CAMPANHA)
        const [rankingOutros] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(patrocinados) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE ${baseCondition}
            AND UPPER(TRIM(variaveis)) NOT LIKE 'PATROCINADO%'
            AND UPPER(TRIM(variaveis)) NOT LIKE 'CAMPANHA%'
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(patrocinados)
          ORDER BY total DESC
        `, filterParams);

        conn.release();

        res.json({
          totalPatrocinados: totais[0]?.totalPatrocinados || 0,
          totalCampanhas: totais[0]?.totalCampanhas || 0,
          totalOutros: totais[0]?.totalOutros || 0,
          rankingPatrocinados: rankingPatrocinados || [],
          rankingCampanhas: rankingCampanhas || [],
          rankingOutros: rankingOutros || [],
        });
      } catch (queryErr) {
        conn.release();
        throw queryErr;
      }
    } catch (error) {
      console.error("Erro ao buscar stats patrocinados:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de patrocinados" });
    }
  });

  return httpServer;
}
