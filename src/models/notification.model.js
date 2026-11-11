import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

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

export async function findAll({ userId, onlyUnread = false } = {}, connection) {
  const conditions = [];
  const params = [];

  if (userId) {
    conditions.push('user_id = ?');
    params.push(Number(userId));
  }
  if (onlyUnread) {
    conditions.push('is_read = 0');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC, id DESC`,
    params,
    connection
  );
  return rows.map(mapNotificationRow);
}

export async function findById(id, connection) {
  const rows = await query(
    'SELECT * FROM notifications WHERE id = ? LIMIT 1',
    [Number(id)],
    connection
  );
  return mapNotificationRow(rows[0]);
}

export async function create(
  { userId, auctionId = null, title, message, type = 'system' },
  connection
) {
  const result = await query(
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
  return findById(result.insertId, connection);
}

export async function markAsRead(id, connection) {
  await query(
    'UPDATE notifications SET is_read = 1 WHERE id = ?',
    [Number(id)],
    connection
  );
  return findById(id, connection);
}

export async function markAllAsRead(userId, connection) {
  const result = await query(
    'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
    [Number(userId)],
    connection
  );
  return result.affectedRows;
}

export async function remove(id, connection) {
  const result = await query(
    'DELETE FROM notifications WHERE id = ?',
    [Number(id)],
    connection
  );
  return result.affectedRows > 0;
}

