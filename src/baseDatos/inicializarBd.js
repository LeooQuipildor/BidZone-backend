import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { entorno, validarEntorno } from '../config/entorno.js';

const carpetaActual = path.dirname(fileURLToPath(import.meta.url));

// Crea la base de datos y todas las tablas leyendo backend/database/schema.sql
async function inicializarBaseDatos() {
  validarEntorno(false);
  const nombreBd = entorno.bd.nombre;
  const rutaSql = path.resolve(carpetaActual, '../../database/schema.sql');
  const contenido = await fs.readFile(rutaSql, 'utf8');

  const sql = contenido
    .replace(/CREATE DATABASE IF NOT EXISTS bidzone_db[\s\S]*?;/i, `CREATE DATABASE IF NOT EXISTS \`${nombreBd}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`)
    .replace(/USE bidzone_db;/i, `USE \`${nombreBd}\`;`);

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
    await conexion.end();
  }
}

inicializarBaseDatos().catch((error) => {
  console.error('[Error BD]', error.message);
  process.exit(1);
});
