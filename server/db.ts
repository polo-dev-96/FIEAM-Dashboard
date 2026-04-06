import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "polo_telecom",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export const TABLE_NAME = process.env.DB_TABLE || "base_senai";

// Pool separado para o banco senai_pf (tabela base_openai)
export const poolOpenAI = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: "senai_pf",
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default pool;
