/**
 * ============================================================================
 * ARCHIVO: src/utilidades/fecha.js
 * ROL: Convierte fechas entre el formato que entiende JavaScript/React y MySQL.
 * ============================================================================
 *
 * ¿POR QUÉ NECESITAMOS ESTO?
 * - React envía fechas en formato ISO 8601: "2026-11-20T18:30:00.000Z"
 * - MySQL (tipo DATETIME) guarda fechas así: "2026-11-20 18:30:00" (sin "T" ni "Z")
 * Estas dos funciones hacen la traducción de ida y vuelta para no perder horas por zona horaria.
 */

// Convierte una fecha JS/ISO al formato DATETIME de MySQL: 'YYYY-MM-DD HH:MM:SS'
export function aFechaMySql(valor) {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null; // Si el texto no era una fecha válida, devuelve null
  return fecha.toISOString().slice(0, 19).replace('T', ' ');
}

// Convierte una fecha que viene de MySQL al formato ISO UTC ('2026-11-20T18:30:00.000Z') para React
export function aFechaIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  }
  const texto = String(valor);
  // Si viene como 'YYYY-MM-DD HH:MM:SS' desde MySQL, agregamos 'T' y 'Z' para marcar que está en UTC
  const normalizada = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(texto)
    ? `${texto.replace(' ', 'T')}Z`
    : texto;
  const fecha = new Date(normalizada);
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toISOString();
}
