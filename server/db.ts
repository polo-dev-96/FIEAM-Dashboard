/*
 * ============================================================
 * server/db.ts — Conexão com o Banco de Dados MySQL
 * ============================================================
 *
 * Este arquivo configura a conexão entre o servidor Node.js
 * e o banco de dados MySQL onde ficam os atendimentos.
 *
 * Usa "pool de conexões" — em vez de abrir e fechar uma conexão
 * para cada consulta, mantém um conjunto de conexões abertas
 * e as reutiliza, melhorando a performance.
 *
 * Conceito de .env:
 *   As configurações sensíveis (host, senha, etc.) são lidas
 *   do arquivo .env (que NÃO vai para o Git por segurança).
 *   O operador || define um valor padrão caso a variável não exista.
 * ============================================================
 */

// dotenv: lê o arquivo .env e injeta as variáveis no process.env
import dotenv from "dotenv";

// mysql2/promise: biblioteca para conectar e fazer queries no MySQL
// A versão "/promise" permite usar async/await nas consultas
import mysql from "mysql2/promise";

// Carrega as variáveis do arquivo .env para process.env
dotenv.config();

/*
 * pool — Pool de conexões principal (banco de atendimentos FIEAM)
 * -------------------------------------------------------
 * Banco usado para: Visão Geral, Dashboard Anual, buscas de protocolo/telefone.
 *
 * Configurações:
 *   host            → endereço do servidor MySQL (padrão: localhost)
 *   port            → porta do MySQL (padrão: 3306)
 *   user / password → credenciais do banco
 *   database        → nome do banco de dados
 *   waitForConnections → se o pool estiver cheio, aguarda em fila (não recusa)
 *   connectionLimit → máximo de 10 conexões simultâneas abertas
 *   queueLimit      → 0 = sem limite de espera na fila (aguarda indefinidamente)
 */
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306", 10), // parseInt converte string "3306" para número
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "polo_telecom",
  waitForConnections: true,
  connectionLimit: 10, // máximo 10 conexões em paralelo
  queueLimit: 0,       // sem limite de fila
});

/*
 * TABLE_NAME — Nome da tabela principal de atendimentos
 * -------------------------------------------------------
 * Exportado para ser usado nos arquivos de rotas (routes.ts).
 * Lido do .env para permitir trocar a tabela sem alterar código.
 * Padrão: "base_senai"
 */
export const TABLE_NAME = process.env.DB_TABLE || "base_senai";

/*
 * poolOpenAI — Pool de conexões para o banco de análises OpenAI
 * -------------------------------------------------------
 * Banco separado "senai_pf" usado exclusivamente pelo Dashboard OpenAI.
 * Contém dados processados pela IA (resumos, categorias, etc.).
 *
 * connectionLimit menor (5) pois é um banco auxiliar com menos uso.
 */
export const poolOpenAI = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  port:     parseInt(process.env.DB_PORT || "3306", 10),
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: "senai_pf", // banco fixo (não varia por ambiente)
  waitForConnections: true,
  connectionLimit: 5,  // menos conexões pois é banco secundário
  queueLimit: 0,
});

// Exporta o pool principal como export padrão para facilitar o import
// Uso: import pool from "./db"
export default pool;
