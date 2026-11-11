import { AppError } from './error.middleware.js';

export function parsePositiveId(raw) {
  const num = Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    return null;
  }
  return num;
}

export function validateParamId(paramName = 'id') {
  return (req, _res, next) => {
    const parsed = parsePositiveId(req.params[paramName]);
    if (!parsed) {
      return next(
        new AppError(400, `El parámetro "${paramName}" debe ser un entero positivo válido.`)
      );
    }
    req.params[paramName] = String(parsed);
    return next();
  };
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function requireFields(body, fields) {
  const safeBody = body && typeof body === 'object' ? body : {};
  const missing = fields.filter((field) => {
    const val = safeBody[field];
    if (val === undefined || val === null) return true;
    if (typeof val === 'string' && val.trim() === '') return true;
    return false;
  });

  if (missing.length > 0) {
    throw new AppError(
      400,
      `Faltan campos obligatorios: ${missing.join(', ')}.`,
      { missing }
    );
  }
}

export function assertPositiveNumber(value, fieldName) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(400, `El campo "${fieldName}" debe ser un número mayor a cero.`);
  }
  return num;
}

export function assertEnumValue(value, allowed, fieldName) {
  if (!allowed.includes(value)) {
    throw new AppError(
      400,
      `Valor inválido para "${fieldName}". Valores permitidos: ${allowed.join(', ')}.`
    );
  }
  return value;
}

