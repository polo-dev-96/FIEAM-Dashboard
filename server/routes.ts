import type { Express } from "express";
import type { Server } from "http";
import pool, { TABLE_NAME } from "./db";
import type { RowDataPacket } from "mysql2";
import ExcelJS from "exceljs";
import bcrypt from "bcryptjs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // POST /api/login - Autenticação com banco de dados (tabela usuarios)
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email e senha são obrigatórios" });
    }

    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, email, senha_hash, nivel_acesso FROM usuarios WHERE email = ? AND ativo = 1",
        [email]
      );

      if (rows.length === 0) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const user = rows[0];
      const senhaCorreta = await bcrypt.compare(password, user.senha_hash);

      if (!senhaCorreta) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      // Atualiza data_atualizacao com o horário do último acesso
      await pool.query("UPDATE usuarios SET data_atualizacao = NOW() WHERE id = ?", [user.id]);

      const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString("base64");

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nivel_acesso: user.nivel_acesso,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

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
      res.json(rows.map((r) => r.nome));
    } catch (error) {
      console.error("Erro ao buscar casas:", error);
      res.status(500).json({ message: "Erro ao buscar casas" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const conn = await pool.getConnection();

      try {
        const { startDate, endDate, casa } = req.query;

        // Build date filter clause
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
          LIMIT 10
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
          LIMIT 10
        `, filterParams);

        // Atendimentos por opcaoselecionada (3 opções específicas)
        const [porOpcaoSelecionada] = await conn.query<RowDataPacket[]>(`
          SELECT
            TRIM(opcaoselecionada) AS nome,
            COUNT(DISTINCT protocolo) AS total
          FROM \`${TABLE_NAME}\`
          WHERE \`data e hora de fim\` IS NOT NULL
            AND TRIM(opcaoselecionada) IN (
              'DENÚNCIAS/CANAL DE ÉTICA E INTEGRIDADE',
              'ELOGIOS/ RECLAMAÇÕES/ SUGESTÕES',
              'INFORMAÇÕES LAI – LEI 12.527/11'
            )
            ${dateFilter}
            ${casaFilter}
          GROUP BY TRIM(opcaoselecionada)
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

        // 2. Atendimentos por Origem (tipo de canal) — deduplicated per protocol
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
          LIMIT 15
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
        extraFilter = `AND \`resumo da conversa\` = ?`;
        extraParams.push(valorStr);
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

      const opcaoFilter = opcao ? `AND TRIM(opcaoselecionada) = ?` : '';
      const opcaoParams = opcao ? [String(opcao)] : [];

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

  return httpServer;
}
