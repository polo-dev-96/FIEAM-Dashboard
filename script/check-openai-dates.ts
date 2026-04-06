import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: "senai_pf",
});

async function check() {
  const [rows] = await pool.query(
    `SELECT MIN(start_time) AS min_date, MAX(start_time) AS max_date, COUNT(*) AS total_rows, SUM(value) AS total_value FROM base_openai`
  );
  console.log("Data range and totals:", JSON.stringify(rows, null, 2));

  const [sample] = await pool.query(
    `SELECT start_time, value, project_name FROM base_openai ORDER BY start_time DESC LIMIT 5`
  );
  console.log("Sample rows:", JSON.stringify(sample, null, 2));

  const [colInfo] = await pool.query(`SHOW COLUMNS FROM base_openai`);
  console.log("Columns:", JSON.stringify(colInfo, null, 2));

  await pool.end();
}

check().catch(console.error);
