import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { env, validateEnv } from '../config/env.js';
import { formatDatabaseError } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  validateEnv({ requireJwt: false });
  const dbName = env.db.database;
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error(
      `Nombre de base de datos inválido en DB_NAME: "${dbName}". Usa solo letras, números o guion bajo.`
    );
  }

  const seedPath = path.resolve(__dirname, '../../database/seed.sql');
  const rawSql = await fs.readFile(seedPath, 'utf8');
  const sql = rawSql.replace(/USE bidzone_db;/i, `USE \`${dbName}\`;`);

  const connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: dbName,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    console.log(`[DB Seed] Cargando datos de prueba desde ${seedPath} en "${dbName}"...`);
    await connection.query(sql);

    // Permite sobreescribir hashes locales mediante variables de entorno en .env
    if (process.env.SEED_ADMIN_PASSWORD) {
      const adminHash = await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD,
        env.bcryptSaltRounds
      );
      await connection.execute(
        `UPDATE users SET password_hash = ? WHERE role = 'admin'`,
        [adminHash]
      );
    }

    if (process.env.SEED_USER_PASSWORD) {
      const userHash = await bcrypt.hash(
        process.env.SEED_USER_PASSWORD,
        env.bcryptSaltRounds
      );
      await connection.execute(
        `UPDATE users SET password_hash = ? WHERE role = 'user'`,
        [userHash]
      );
    }

    console.log('[DB Seed] Datos iniciales cargados correctamente.');
  } finally {
    await connection.end();
  }
}

seedDatabase().catch((err) => {
  console.error('[DB Seed Error]', formatDatabaseError(err));
  process.exit(1);
});

