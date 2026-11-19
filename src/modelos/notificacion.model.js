import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de notificación al formato JSON de la API
export function formatearNotificacion(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    userId: Number(fila.usuario_id),
    auctionId: fila.subasta_id != null ? Number(fila.subasta_id) : null,
    title: fila.titulo,
    message: fila.mensaje,
    type: fila.tipo,
    read: Boolean(fila.leida),
    createdAt: aFechaIso(fila.creado_en),
  };
}

// Lista notificaciones de un usuario (opcionalmente solo las no leídas)
export async function listarTodas({ userId, onlyUnread = false } = {}) {
  const filtros = [];
  const valores = [];

  if (userId) {
    filtros.push('usuario_id = ?');
    valores.push(Number(userId));
  }
  if (onlyUnread) filtros.push('leida = 0');

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT * FROM notificaciones ${where} ORDER BY creado_en DESC, id DESC`,
    valores
  );
  return filas.map(formatearNotificacion);
}

// Busca una notificación por ID
export async function buscarPorId(id) {
  const filas = await consultar('SELECT * FROM notificaciones WHERE id = ? LIMIT 1', [Number(id)]);
  return formatearNotificacion(filas[0]);
}

// Crea una notificación nueva
export async function crear(datos) {
  const resultado = await consultar(
    `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, ?)`,
    [
      Number(datos.userId),
      datos.auctionId ? Number(datos.auctionId) : null,
      datos.title,
      datos.message,
      datos.type || 'system',
    ]
  );
  return buscarPorId(resultado.insertId);
}

// Marca una notificación como leída
export async function marcarLeida(id) {
  await consultar('UPDATE notificaciones SET leida = 1 WHERE id = ?', [Number(id)]);
  return buscarPorId(id);
}

// Marca todas las notificaciones pendientes de un usuario como leídas
export async function marcarTodasLeidas(idUsuario) {
  const resultado = await consultar(
    'UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0',
    [Number(idUsuario)]
  );
  return resultado.affectedRows;
}

// Elimina una notificación por ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM notificaciones WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}
