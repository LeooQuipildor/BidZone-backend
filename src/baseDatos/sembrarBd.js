import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { entorno, validarEntorno } from '../config/entorno.js';

const carpetaActual = path.dirname(fileURLToPath(import.meta.url));

// Carga datos de prueba leyendo backend/database/seed.sql
async function sembrarBaseDatos() {
  validarEntorno(false);
  const nombreBd = entorno.bd.nombre;
  const rutaSql = path.resolve(carpetaActual, '../../database/seed.sql');
  const sql = (await fs.readFile(rutaSql, 'utf8')).replace(/USE bidzone_db;/i, `USE \`${nombreBd}\`;`);

  const conexion = await mysql.createConnection({
    host: entorno.bd.host,
    port: entorno.bd.puerto,
    user: entorno.bd.usuario,
    password: entorno.bd.contrasena,
    database: nombreBd,
    multipleStatements: true,
    timezone: 'Z',
  });

  try {
    await conexion.query(sql);

    if (process.env.SEED_ADMIN_PASSWORD) {
      const hash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, entorno.rondasBcrypt);
      await conexion.execute(`UPDATE usuarios SET contrasena_hash = ? WHERE rol = 'admin'`, [hash]);
    }
    if (process.env.SEED_USER_PASSWORD) {
      const hash = await bcrypt.hash(process.env.SEED_USER_PASSWORD, entorno.rondasBcrypt);
      await conexion.execute(`UPDATE usuarios SET contrasena_hash = ? WHERE rol = 'usuario'`, [hash]);
    }

    console.log('[BD] Datos iniciales cargados correctamente (25 usuarios y 50 subastas).');
  } finally {
    await conexion.end();
  }
}

sembrarBaseDatos().catch((error) => {
  console.error('[Error Seed]', error.message);
  process.exit(1);
});
