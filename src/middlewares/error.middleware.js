import { env } from '../config/env.js';

export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof SyntaxError && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: 'El cuerpo de la solicitud no contiene un JSON válido.',
    });
  }

  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Tu sesión expiró. Inicia sesión nuevamente.',
    });
  }

  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Token de autenticación inválido.',
    });
  }

  switch (err?.code) {
    case 'ER_DUP_ENTRY':
      return res.status(409).json({
        message: 'Ya existe un registro con el identificador o valor único ingresado.',
      });
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return res.status(400).json({
        message: 'La entidad referenciada no existe en la base de datos.',
      });
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return res.status(409).json({
        message:
          'No se puede eliminar este registro porque tiene operaciones asociadas.',
      });
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return res.status(400).json({
        message: 'Los datos enviados incumplen las restricciones de validación.',
      });
    case 'ECONNREFUSED':
    case 'ER_ACCESS_DENIED_ERROR':
    case 'ER_BAD_DB_ERROR':
      return res.status(503).json({
        message:
          'Servicio de base de datos no disponible temporalmente. Verifica la conexión con MySQL.',
      });
    default:
      break;
  }

  if (env.nodeEnv !== 'test') {
    console.error('[Error no controlado]', err);
  }

  return res.status(500).json({
    message: 'Error interno del servidor.',
  });
}

