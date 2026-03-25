import dotenv from "dotenv";
dotenv.config();

import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "polo_telecom",
});

async function seed() {
  const conn = await pool.getConnection();
  try {
    const hash = await bcrypt.hash("Senai@123", 10);

    // Usuário SENAI (acesso limitado: Visão Geral + Dashboard SAC)
    await conn.query(
      `INSERT INTO usuarios (email, senha_hash, nivel_acesso, ativo)
       VALUES (?, ?, 'visualizador', 1)
       ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash), nivel_acesso = VALUES(nivel_acesso)`,
      ["senai@polotelecom.com", hash]
    );

    // Usuário Admin (acesso total)
    await conn.query(
      `INSERT INTO usuarios (email, senha_hash, nivel_acesso, ativo)
       VALUES (?, ?, 'admin', 1)
       ON DUPLICATE KEY UPDATE senha_hash = VALUES(senha_hash), nivel_acesso = VALUES(nivel_acesso)`,
      ["admin@polotelecom.com.br", hash]
    );

    console.log("✅ Usuários inseridos com sucesso!");
    console.log("   - senai@polotelecom.com (visualizador)");
    console.log("   - admin@polotelecom.com.br (admin)");
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Erro ao inserir usuários:", err);
  process.exit(1);
});
