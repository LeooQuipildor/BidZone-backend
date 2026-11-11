import * as userModel from '../models/user.model.js';
import { verifyJwtToken } from '../utils/jwt.js';
import { AppError } from './error.middleware.js';

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const parts = header.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  return parts[1];
}

export function createAuthMiddlewares({ findUserById = userModel.findById } = {}) {
  const verifyToken = async (req, _res, next) => {
    try {
      const token = extractBearerToken(req);
      if (!token) {
        return next(
          new AppError(401, 'Acceso denegado. Debes enviar un token Bearer válido.')
        );
      }

      const decoded = verifyJwtToken(token);
      const user = await findUserById(decoded.id);
      if (!user) {
        return next(new AppError(401, 'El usuario asociado al token ya no existe.'));
      }

      // RN06: Bloquear acceso inmediato a cuentas suspendidas o cerradas
      if (user.status !== 'active') {
        return next(
          new AppError(
            403,
            'RN06: Esta cuenta ha sido suspendida o cerrada por infracciones a las reglas de BidZone.'
          )
        );
      }

      req.user = user;
      return next();
    } catch (err) {
      return next(err);
    }
  };

  const optionalAuth = async (req, _res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      req.user = null;
      return next();
    }
    try {
      const decoded = verifyJwtToken(token);
      const user = await findUserById(decoded.id);
      req.user = user && user.status === 'active' ? user : null;
    } catch {
      req.user = null;
    }
    return next();
  };

  const requireRole = (...allowedRoles) => (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'Se requiere iniciar sesión para realizar esta acción.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          403,
          'No cuentas con los permisos de rol necesarios para ejecutar esta operación.'
        )
      );
    }
    return next();
  };

  return { verifyToken, optionalAuth, requireRole };
}

export const { verifyToken, optionalAuth, requireRole } = createAuthMiddlewares();

