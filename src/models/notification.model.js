import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

// Convierte una fila SQL cruda en un objeto Notificación estándar para la API
export function mapNotificationRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    auctionId: row.auction_id !== null && row.auction_id !== undefined ? Number(row.auction_id) : null,
    title: row.title,
    message: row.message,
    type: row.type,
    read: Boolean(row.is_read),
    createdAt: toIsoUtc(row.created_at),
  };
}

// Lista las notificaciones de un usuario
export async function findAll({ userId, onlyUnread = false } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (userId) {
    condiciones.push('user_id = ?');
    parametros.push(Number(userId));
  }
  if (onlyUnread) {
    condiciones.push('is_read = 0');
  }

  const dondeSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await query(
    `SELECT * FROM notifications ${dondeSql} ORDER BY created_at DESC, id DESC`,
    parametros,
    connection
  );
  return filas.map(mapNotificationRow);
}

// Busca una notificación por ID
export async function findById(id, connection) {
  const filas = await query(
    'SELECT * FROM notifications WHERE id = ? LIMIT 1',
    [Number(id)],
    connection
  );
  return mapNotificationRow(filas[0]);
}

// Inserta una nueva notificación en la base de datos
export async function create(
  { userId, auctionId = null, title, message, type = 'system' },
  connection
) {
  const resultado = await query(
    `INSERT INTO notifications (user_id, auction_id, title, message, type)
     VALUES (?, ?, ?, ?, ?)`,
    [
      Number(userId),
      auctionId ? Number(auctionId) : null,
      title,
      message,
      type,
    ],
    connection
  );
  return findById(resultado.insertId, connection);
}

// Marca una notificación individual como leída
export async function markAsRead(id, connection) {
  await query('UPDATE notifications SET is_read = 1 WHERE id = ?', [Number(id)], connection);
  return findById(id, connection);
}

// Marca todas las notificaciones pendientes de un usuario como leídas
export async function markAllAsRead(userId, connection) {
  const resultado = await query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [Number(userId)],
    connection
  );
  return resultado.affectedRows;
}

// Elimina una notificación por ID
export async function remove(id, connection) {
  const resultado = await query('DELETE FROM notifications WHERE id = ?', [Number(id)], connection);
  return resultado.affectedRows > 0;
}
