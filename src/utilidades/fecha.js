// Convierte una fecha JS/ISO al formato DATETIME de MySQL: 'YYYY-MM-DD HH:MM:SS'
export function aFechaMySql(valor) {
  if (!valor) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 19).replace('T', ' ');
}

// Convierte una fecha de MySQL al formato ISO UTC para enviar al frontend
export function aFechaIso(valor) {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.toISOString();
  }
  const texto = String(valor);
  const normalizada = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(texto)
    ? `${texto.replace(' ', 'T')}Z`
    : texto;
  const fecha = new Date(normalizada);
  return Number.isNaN(fecha.getTime()) ? texto : fecha.toISOString();
}
