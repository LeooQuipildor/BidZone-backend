import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { env, validateEnv } from '../config/env.js';
import { formatDatabaseError } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  validateEnv({ requireJwt: false });
  const dbName = env.db.database;
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error(
      `Nombre de base de datos inválido en DB_NAME: "${dbName}". Usa solo letras, números o guion bajo.`
    );
  }

  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const rawSql = await fs.readFile(schemaPath, 'utf8');
  const sql = rawSql
    .replace(
      /CREATE DATABASE IF NOT EXISTS bidzone_db[\s\S]*?;/i,
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    )
    .replace(/USE bidzone_db;/i, `USE \`${dbName}\`;`);

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    console.log(`[DB Init] Ejecutando esquema desde ${schemaPath} sobre "${dbName}"...`);
    await connection.query(sql);
    console.log(`[DB Init] Base de datos "${dbName}" y tablas creadas correctamente.`);
  } finally {
    await connection.end();
  }
}

initDatabase().catch((err) => {
  console.error('[DB Init Error]', formatDatabaseError(err));
  process.exit(1);
});

