import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

export function mapReviewRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    auctionId: Number(row.auction_id),
    reviewerId: Number(row.reviewer_id),
    targetUserId: Number(row.target_user_id),
    rating: Number(row.rating),
    comment: row.comment,
    roleContext: row.role_context,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    auctionTitle: row.auction_title ?? undefined,
    reviewerName: row.reviewer_name ?? undefined,
    targetUserName: row.target_user_name ?? undefined,
  };
}

export async function findAll({ auctionId, targetUserId, reviewerId } = {}, connection) {
  const conditions = [];
  const params = [];

  if (auctionId) {
    conditions.push('rv.auction_id = ?');
    params.push(Number(auctionId));
  }
  if (targetUserId) {
    conditions.push('rv.target_user_id = ?');
    params.push(Number(targetUserId));
  }
  if (reviewerId) {
    conditions.push('rv.reviewer_id = ?');
    params.push(Number(reviewerId));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT
       rv.*,
       a.title AS auction_title,
       u_rev.name AS reviewer_name,
       u_tgt.name AS target_user_name
     FROM reviews rv
     INNER JOIN auctions a ON a.id = rv.auction_id
     INNER JOIN users u_rev ON u_rev.id = rv.reviewer_id
     INNER JOIN users u_tgt ON u_tgt.id = rv.target_user_id
     ${whereClause}
     ORDER BY rv.created_at DESC, rv.id DESC`,
    params,
    connection
  );
  return rows.map(mapReviewRow);
}

export async function findById(id, connection) {
  const rows = await query(
    `SELECT
       rv.*,
       a.title AS auction_title,
       u_rev.name AS reviewer_name,
       u_tgt.name AS target_user_name
     FROM reviews rv
     INNER JOIN auctions a ON a.id = rv.auction_id
     INNER JOIN users u_rev ON u_rev.id = rv.reviewer_id
     INNER JOIN users u_tgt ON u_tgt.id = rv.target_user_id
     WHERE rv.id = ?
     LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapReviewRow(rows[0]);
}

export async function existsByAuctionAndReviewer(conn, auctionId, reviewerId) {
  const rows = await query(
    'SELECT id FROM reviews WHERE auction_id = ? AND reviewer_id = ? LIMIT 1',
    [Number(auctionId), Number(reviewerId)],
    conn
  );
  return rows.length > 0;
}

export async function recalculateUserReputation(conn, targetUserId) {
  const rows = await query(
    'SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total FROM reviews WHERE target_user_id = ?',
    [Number(targetUserId)],
    conn
  );
  const total = Number(rows[0]?.total || 0);
  const newReputation = total > 0 ? Number(rows[0].avg_rating) : 5.0;
  await query(
    'UPDATE users SET reputation = ? WHERE id = ?',
    [newReputation, Number(targetUserId)],
    conn
  );
  return newReputation;
}

export async function create(
  conn,
  {
    auctionId,
    reviewerId,
    targetUserId,
    rating,
    comment = '',
    roleContext = 'comprador_a_vendedor',
  }
) {
  const result = await query(
    `INSERT INTO reviews (auction_id, reviewer_id, target_user_id, rating, comment, role_context)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(auctionId),
      Number(reviewerId),
      Number(targetUserId),
      Number(rating),
      comment,
      roleContext,
    ],
    conn
  );
  return findById(result.insertId, conn);
}

export async function update(conn, id, fields) {
  const allowedColumnMap = {
    rating: 'rating',
    comment: 'comment',
    roleContext: 'role_context',
  };

  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(allowedColumnMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return findById(id, conn);
  }

  params.push(Number(id));
  await query(
    `UPDATE reviews SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
    conn
  );
  return findById(id, conn);
}

export async function remove(conn, id) {
  const result = await query(
    'DELETE FROM reviews WHERE id = ?',
    [Number(id)],
    conn
  );
  return result.affectedRows > 0;
}

