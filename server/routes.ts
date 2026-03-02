import type { Express } from "express";
import type { Server } from "http";
import pool, { TABLE_NAME } from "./db";
import type { RowDataPacket } from "mysql2";
import ExcelJS from "exceljs";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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

  return httpServer;
}
