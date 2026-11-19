/**
 * ============================================================================
 * ARCHIVO: src/config/entorno.js
 * ROL: Carga las variables de configuración desde el archivo ".env".
 * ============================================================================
 *
 * ¿POR QUÉ SE USA UN ARCHIVO ".env"?
 * Nunca se deben escribir contraseñas de MySQL ni claves secretas JWT directo
 * en el código fuente porque se subirían a GitHub. El archivo ".env" vive solo
 * en tu computadora (está en .gitignore) y la librería "dotenv" lo lee al iniciar.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// En módulos ES ("type": "module"), calculamos la ruta de esta carpeta para encontrar "../../.env"
const rutaActual = fileURLToPath(import.meta.url);
const carpetaActual = path.dirname(rutaActual);
dotenv.config({ path: path.resolve(carpetaActual, '../../.env') });

// Objeto central con toda la configuración del proyecto (si falta una variable, usa un valor por defecto)
export const entorno = {
  puerto: Number(process.env.PORT) || 3000,               // Puerto donde escucha Express
  modo: process.env.NODE_ENV || 'development',            // 'development', 'production' o 'test'
  origenCors: process.env.CORS_ORIGIN || 'http://localhost:5173', // Dirección del frontend React
  jwtSecreto: process.env.JWT_SECRET || '',               // Clave secreta para firmar tokens JWT
  jwtExpiraEn: process.env.JWT_EXPIRES_IN || '8h',        // Duración de cada sesión (8 horas)
  rondasBcrypt: 10,                                       // Nivel de seguridad para encriptar contraseñas
  bd: {
    host: process.env.DB_HOST || 'localhost',             // Servidor donde corre MySQL
    puerto: Number(process.env.DB_PORT) || 3306,          // Puerto estándar de MySQL
    usuario: process.env.DB_USER || 'root',               // Usuario de MySQL
    contrasena: process.env.DB_PASSWORD || '',            // Contraseña de MySQL
    nombre: process.env.DB_NAME || 'bidzone_db',          // Nombre de la base de datos
  },
};

/**
 * Revisa que las variables obligatorias estén completas antes de arrancar.
 * Si falta alguna, lanza un error claro para avisar al programador qué debe completar en .env.
 */
export function validarEntorno(exigirJwt = true) {
  if (exigirJwt && !entorno.jwtSecreto) {
    throw new Error('Falta configurar JWT_SECRET en el archivo backend/.env');
  }
  if (!entorno.bd.usuario || !entorno.bd.nombre) {
    throw new Error('Faltan DB_USER o DB_NAME en el archivo backend/.env');
  }
}
