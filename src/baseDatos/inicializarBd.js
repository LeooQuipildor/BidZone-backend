/**
 * ============================================================================
 * ARCHIVO: src/baseDatos/inicializarBd.js
 * ROL: Script de consola ("npm run db:init") que crea la base de datos y las 6 tablas.
 * ============================================================================
 *
 * ¿CÓMO FUNCIONA?
 * Lee el archivo SQL "backend/database/schema.sql", reemplaza el nombre de la BD
 * por el valor configurado en DB_NAME (.env), se conecta a MySQL con permisos para
 * ejecutar múltiples sentencias juntas y crea todas las tablas desde cero.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { entorno, validarEntorno } from '../config/entorno.js';

const carpetaActual = path.dirname(fileURLToPath(import.meta.url));

async function inicializarBaseDatos() {
  // Validamos solo las credenciales de MySQL (aquí no hace falta JWT_SECRET)
  validarEntorno(false);

  const nombreBd = entorno.bd.nombre;
  const rutaSql = path.resolve(carpetaActual, '../../database/schema.sql');
  const contenido = await fs.readFile(rutaSql, 'utf8');

  // Adaptamos el script SQL al nombre de base de datos configurado en .env
  const sql = contenido
    .replace(/CREATE DATABASE IF NOT EXISTS bidzone_db[\s\S]*?;/i, `CREATE DATABASE IF NOT EXISTS \`${nombreBd}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
    .replace(/USE bidzone_db;/i, `USE \`${nombreBd}\`;`);

  // Conexión directa (sin pool) con multipleStatements: true para ejecutar todo schema.sql de una vez
  const conexion = await mysql.createConnection({
    host: entorno.bd.host,
    port: entorno.bd.puerto,
    user: entorno.bd.usuario,
    password: entorno.bd.contrasena,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    await conexion.query(sql);
    console.log(`[BD] Base de datos "${nombreBd}" y tablas creadas correctamente.`);
  } finally {
    await conexion.end(); // Siempre cerramos la conexión al terminar
  }
}

inicializarBaseDatos().catch((error) => {
  console.error('[Error BD]', error.message);
  process.exit(1);
});
