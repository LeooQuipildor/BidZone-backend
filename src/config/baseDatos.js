import mysql from 'mysql2/promise';
import { entorno } from './entorno.js';

// Pool de conexiones reutilizables hacia MySQL
export const pool = mysql.createPool({
  host: entorno.bd.host,
  port: entorno.bd.puerto,
  user: entorno.bd.usuario,
  password: entorno.bd.contrasena,
  database: entorno.bd.nombre,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: 'Z',
  decimalNumbers: true,
});

// Ejecuta una consulta SQL y devuelve directamente las filas resultantes
export async function consultar(sql, parametros = [], conexion = pool) {
  const [filas] = await conexion.execute(sql, parametros);
  return filas;
}

// Ejecuta varias consultas juntas: si una falla, deshace todas (rollback)
export async function ejecutarTransaccion(tarea) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await tarea(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback().catch(() => {});
    throw error;
  } finally {
    conexion.release();
  }
}

// Verifica si MySQL responde correctamente
export async function probarConexionBd() {
  const [filas] = await pool.query('SELECT 1 AS ok');
  return filas?.[0]?.ok === 1;
}
