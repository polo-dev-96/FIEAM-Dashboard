import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "polo_telecom",
});

async function alter() {
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `ALTER TABLE usuarios MODIFY COLUMN nivel_acesso ENUM('master','admin','gerente','visualizador','entidade') NOT NULL DEFAULT 'visualizador'`
    );
    console.log("✅ Coluna nivel_acesso alterada com sucesso! Agora inclui 'master'.");
  } finally {
    conn.release();
    await pool.end();
  }
}

alter().catch((err) => {
  console.error("Erro ao alterar coluna:", err);
  process.exit(1);
});
