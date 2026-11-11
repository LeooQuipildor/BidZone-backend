import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  decimalNumbers: true,
});

export async function query(sql, params = [], connection = pool) {
  const [rows] = await connection.execute(sql, params);
  return rows;
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Ignorar fallo secundario en rollback si la conexión ya se cerró
    }
    throw error;
  } finally {
    connection.release();
  }
}

export async function testDatabaseConnection() {
  const [rows] = await pool.query('SELECT 1 AS ok');
  return rows?.[0]?.ok === 1;
}

export function formatDatabaseError(err, db = env.db) {
  const code = err?.code || err?.errors?.[0]?.code || '';
  const rawMessage =
    err?.message ||
    err?.errors?.map((e) => e.message).filter(Boolean).join('; ') ||
    code ||
    'Error desconocido';

  if (code === 'ECONNREFUSED') {
    return `No se pudo conectar a MySQL en ${db.host}:${db.port} (ECONNREFUSED). Verifica que el servidor MySQL (MySQL Server, XAMPP o Laragon) esté iniciado y escuchando en ese puerto.`;
  }
  if (code === 'ER_ACCESS_DENIED_ERROR') {
    return `Acceso denegado a MySQL para el usuario "${db.user}" (ER_ACCESS_DENIED_ERROR). Revisa DB_USER y DB_PASSWORD en backend/.env.`;
  }
  if (code === 'ER_BAD_DB_ERROR') {
    return `La base de datos "${db.database}" no existe en MySQL (ER_BAD_DB_ERROR). Ejecuta primero "npm run db:init" y "npm run db:seed".`;
  }
  if (code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
    return `No se pudo alcanzar el host MySQL "${db.host}:${db.port}" (${code}). Revisa DB_HOST y DB_PORT en backend/.env.`;
  }

  return code && !rawMessage.includes(code)
    ? `${rawMessage} (${code})`
    : rawMessage;
}

