/**
 * ============================================================================
 * ARCHIVO: src/config/baseDatos.js
 * ROL: Conexión oficial entre Node.js y MySQL usando "mysql2/promise".
 * ============================================================================
 *
 * ¿QUÉ ES UN "POOL" DE CONEXIONES?
 * Abrir y cerrar una conexión con MySQL en cada consulta sería muy lento.
 * Un "pool" mantiene hasta 10 conexiones listas y reutilizables: cuando llega
 * una consulta toma una libre, la usa y la devuelve al instante.
 */

import mysql from 'mysql2/promise';
import { entorno } from './entorno.js';

// Creamos el pool de conexiones con los datos leídos desde entorno.js
export const pool = mysql.createPool({
  host: entorno.bd.host,
  port: entorno.bd.puerto,
  user: entorno.bd.usuario,
  password: entorno.bd.contrasena,
  database: entorno.bd.nombre,
  waitForConnections: true, // Si las 10 conexiones están ocupadas, espera turno en lugar de fallar
  connectionLimit: 10,      // Máximo 10 conexiones simultáneas
  timezone: 'Z',            // Todas las fechas se manejan en horario UTC estándar
  decimalNumbers: true,     // Devuelve columnas DECIMAL (precios/reputación) como número JS y no como texto
});

/**
 * Ejecuta una consulta SQL segura usando placeholders "?".
 * Ejemplo: consultar('SELECT * FROM usuarios WHERE id = ?', [5])
 *
 * - sql: Texto de la consulta SQL.
 * - parametros: Array de valores que reemplazan a cada "?" en orden (evita Inyección SQL).
 * - conexion: Por defecto usa el pool; dentro de una transacción recibe esa conexión específica.
 */
export async function consultar(sql, parametros = [], conexion = pool) {
  const [filas] = await conexion.execute(sql, parametros);
  return filas;
}

/**
 * Ejecuta varias operaciones SQL como una sola unidad atómica ("todo o nada").
 * - Si todas las consultas dentro de "tarea(conexion)" salen bien -> hace COMMIT (guarda todo).
 * - Si cualquiera falla -> hace ROLLBACK (deshace todos los cambios para no dejar datos rotos).
 * - Pase lo que pase -> en "finally" libera la conexión para que vuelva al pool.
 */
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

/**
 * Consulta mínima ("SELECT 1") usada al arrancar el servidor y en GET /api/salud
 * para confirmar que MySQL está respondiendo.
 */
export async function probarConexionBd() {
  const [filas] = await pool.query('SELECT 1 AS ok');
  return filas?.[0]?.ok === 1;
}
