import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

export const env = {
  get port() {
    return Number(process.env.PORT) || 3000;
  },
  get nodeEnv() {
    return process.env.NODE_ENV || 'development';
  },
  get corsOrigin() {
    return process.env.CORS_ORIGIN || 'http://localhost:5173';
  },
  get jwtSecret() {
    return process.env.JWT_SECRET || '';
  },
  get jwtExpiresIn() {
    return process.env.JWT_EXPIRES_IN || '8h';
  },
  get bcryptSaltRounds() {
    return Math.max(8, Number(process.env.BCRYPT_SALT_ROUNDS) || 10);
  },
  db: {
    get host() {
      return process.env.DB_HOST || 'localhost';
    },
    get port() {
      return Number(process.env.DB_PORT) || 3306;
    },
    get user() {
      return process.env.DB_USER || 'root';
    },
    get password() {
      return process.env.DB_PASSWORD || '';
    },
    get database() {
      return process.env.DB_NAME || 'bidzone_db';
    },
  },
};

const PLACEHOLDER_VALUES = new Set([
  'reemplazar_con_clave_secreta_larga_y_unica',
  'tu_usuario_mysql',
  'tu_password_mysql',
]);

export function validateEnv({ requireJwt = true } = {}) {
  const missing = [];
  const placeholders = [];

  if (requireJwt) {
    if (!env.jwtSecret) {
      missing.push('JWT_SECRET');
    } else if (PLACEHOLDER_VALUES.has(env.jwtSecret)) {
      placeholders.push('JWT_SECRET');
    }
  }

  if (!env.db.user) {
    missing.push('DB_USER');
  } else if (PLACEHOLDER_VALUES.has(env.db.user)) {
    placeholders.push('DB_USER');
  }

  if (PLACEHOLDER_VALUES.has(env.db.password)) {
    placeholders.push('DB_PASSWORD');
  }

  if (!env.db.database) {
    missing.push('DB_NAME');
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno obligatorias faltantes (${missing.join(', ')}). Copia .env.example a .env y completa los valores.`
    );
  }

  if (placeholders.length > 0) {
    throw new Error(
      `Reemplaza los valores de ejemplo en backend/.env para: ${placeholders.join(', ')}.`
    );
  }
}
