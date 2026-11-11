export function toMySqlUtcDatetime(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

export function toIsoUtc(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const str = String(value);
  // Si viene como 'YYYY-MM-DD HH:MM:SS' desde MySQL (sin Z), interpretarlo en UTC
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(str)
    ? `${str.replace(' ', 'T')}Z`
    : str;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? str : date.toISOString();
}

