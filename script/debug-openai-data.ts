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

async function debug() {
  // 1. Show raw data samples (first 10 rows with dates)
  const [sample] = await pool.query(
    `SELECT id, start_time, value, project_name FROM base_openai WHERE TRIM(start_time) != '' AND start_time != 'Invalid DateTime' LIMIT 15`
  );
  console.log("=== RAW SAMPLE (first 15 valid rows) ===");
  console.log(JSON.stringify(sample, null, 2));

  // 2. Test STR_TO_DATE parsing
  const [parsed] = await pool.query(`
    SELECT 
      start_time AS raw_date,
      STR_TO_DATE(start_time, '%d-%m-%Y') AS parsed_date,
      value AS raw_value,
      CAST(REPLACE(value, '$', '') AS DECIMAL(20,6)) AS parsed_value
    FROM base_openai 
    WHERE TRIM(start_time) != '' AND start_time != 'Invalid DateTime' AND TRIM(value) != ''
    LIMIT 15
  `);
  console.log("\n=== PARSED DATES & VALUES ===");
  console.log(JSON.stringify(parsed, null, 2));

  // 3. Check January 2026 data specifically
  const [janData] = await pool.query(`
    SELECT 
      DATE_FORMAT(STR_TO_DATE(start_time, '%d-%m-%Y'), '%Y-%m-%d') AS data,
      SUM(CAST(REPLACE(value, '$', '') AS DECIMAL(20,6))) AS total
    FROM base_openai 
    WHERE start_time IS NOT NULL AND TRIM(start_time) != '' AND start_time != 'Invalid DateTime' 
      AND value IS NOT NULL AND TRIM(value) != ''
      AND STR_TO_DATE(start_time, '%d-%m-%Y') >= '2026-01-01' 
      AND STR_TO_DATE(start_time, '%d-%m-%Y') <= '2026-01-31'
    GROUP BY DATE_FORMAT(STR_TO_DATE(start_time, '%d-%m-%Y'), '%Y-%m-%d')
    ORDER BY data ASC
  `);
  console.log("\n=== JANUARY 2026 DAILY DATA ===");
  console.log(JSON.stringify(janData, null, 2));

  // 4. Sum for January 2026
  const [janTotal] = await pool.query(`
    SELECT 
      COALESCE(SUM(CAST(REPLACE(value, '$', '') AS DECIMAL(20,6))), 0) AS total,
      COUNT(*) AS rows_count
    FROM base_openai 
    WHERE start_time IS NOT NULL AND TRIM(start_time) != '' AND start_time != 'Invalid DateTime' 
      AND value IS NOT NULL AND TRIM(value) != ''
      AND STR_TO_DATE(start_time, '%d-%m-%Y') >= '2026-01-01' 
      AND STR_TO_DATE(start_time, '%d-%m-%Y') <= '2026-01-31'
  `);
  console.log("\n=== JANUARY 2026 TOTAL ===");
  console.log(JSON.stringify(janTotal, null, 2));

  // 5. Check distinct date formats in the table
  const [formats] = await pool.query(`
    SELECT start_time, LENGTH(start_time) AS len
    FROM base_openai
    WHERE TRIM(start_time) != '' AND start_time != 'Invalid DateTime'
    GROUP BY start_time
    ORDER BY STR_TO_DATE(start_time, '%d-%m-%Y') ASC
    LIMIT 30
  `);
  console.log("\n=== ALL DISTINCT DATES (first 30) ===");
  console.log(JSON.stringify(formats, null, 2));

  await pool.end();
}

debug().catch(console.error);
