import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Carga las variables del archivo backend/.env en process.env
const rutaActual = fileURLToPath(import.meta.url);
const carpetaActual = path.dirname(rutaActual);
dotenv.config({ path: path.resolve(carpetaActual, '../../.env') });

// Configuración general del servidor y la base de datos
export const entorno = {
  puerto: Number(process.env.PORT) || 3000,
  modo: process.env.NODE_ENV || 'development',
  origenCors: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwtSecreto: process.env.JWT_SECRET || '',
  jwtExpiraEn: process.env.JWT_EXPIRES_IN || '8h',
  rondasBcrypt: 10,
  bd: {
    host: process.env.DB_HOST || 'localhost',
    puerto: Number(process.env.DB_PORT) || 3306,
    usuario: process.env.DB_USER || 'root',
    contrasena: process.env.DB_PASSWORD || '',
    nombre: process.env.DB_NAME || 'bidzone_db',
  },
};

// Revisa que existan las variables mínimas antes de arrancar
export function validarEntorno(exigirJwt = true) {
  if (exigirJwt && !entorno.jwtSecreto) {
    throw new Error('Falta configurar JWT_SECRET en el archivo backend/.env');
  }
  if (!entorno.bd.usuario || !entorno.bd.nombre) {
    throw new Error('Faltan DB_USER o DB_NAME en el archivo backend/.env');
  }
}
