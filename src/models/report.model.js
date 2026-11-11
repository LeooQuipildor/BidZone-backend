import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

export function mapReportRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    auctionId: Number(row.auction_id),
    reporterId: Number(row.reporter_id),
    reportedUserId: Number(row.reported_user_id),
    reason: row.reason,
    description: row.description,
    evidenceUrl: row.evidence_url ?? '',
    status: row.status,
    sanctionApplied: row.sanction_applied,
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    auctionTitle: row.auction_title ?? undefined,
    reporterName: row.reporter_name ?? undefined,
    reportedUserName: row.reported_user_name ?? undefined,
  };
}

export async function findAll({ status, auctionId, participantUserId } = {}, connection) {
  const conditions = [];
  const params = [];

  if (status && status !== 'todos') {
    conditions.push('r.status = ?');
    params.push(status);
  }
  if (auctionId) {
    conditions.push('r.auction_id = ?');
    params.push(Number(auctionId));
  }
  if (participantUserId) {
    conditions.push('(r.reporter_id = ? OR r.reported_user_id = ?)');
    params.push(Number(participantUserId), Number(participantUserId));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT
       r.*,
       a.title AS auction_title,
       u_rep.name AS reporter_name,
       u_inf.name AS reported_user_name
     FROM reports r
     INNER JOIN auctions a ON a.id = r.auction_id
     INNER JOIN users u_rep ON u_rep.id = r.reporter_id
     INNER JOIN users u_inf ON u_inf.id = r.reported_user_id
     ${whereClause}
     ORDER BY r.created_at DESC, r.id DESC`,
    params,
    connection
  );
  return rows.map(mapReportRow);
}

export async function findById(id, connection) {
  const rows = await query(
    `SELECT
       r.*,
       a.title AS auction_title,
       u_rep.name AS reporter_name,
       u_inf.name AS reported_user_name
     FROM reports r
     INNER JOIN auctions a ON a.id = r.auction_id
     INNER JOIN users u_rep ON u_rep.id = r.reporter_id
     INNER JOIN users u_inf ON u_inf.id = r.reported_user_id
     WHERE r.id = ?
     LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapReportRow(rows[0]);
}

export async function create(
  conn,
  {
    auctionId,
    reporterId,
    reportedUserId,
    reason,
    description,
    evidenceUrl = '',
    status = 'en_revision',
    sanctionApplied = 'Pendiente de evaluación',
  }
) {
  const result = await query(
    `INSERT INTO reports (
       auction_id, reporter_id, reported_user_id, reason,
       description, evidence_url, status, sanction_applied
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(auctionId),
      Number(reporterId),
      Number(reportedUserId),
      reason,
      description,
      evidenceUrl,
      status,
      sanctionApplied,
    ],
    conn
  );
  return findById(result.insertId, conn);
}

export async function update(conn, id, fields) {
  const allowedColumnMap = {
    reason: 'reason',
    description: 'description',
    evidenceUrl: 'evidence_url',
    status: 'status',
    sanctionApplied: 'sanction_applied',
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
    `UPDATE reports SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
    conn
  );
  return findById(id, conn);
}

export async function remove(id, connection) {
  const result = await query(
    'DELETE FROM reports WHERE id = ?',
    [Number(id)],
    connection
  );
  return result.affectedRows > 0;
}

