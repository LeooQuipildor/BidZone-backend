import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

// Convierte una fila SQL cruda en un objeto Reseña estándar para la API
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

// Lista las calificaciones aplicando filtros opcionales
export async function findAll({ auctionId, targetUserId, reviewerId } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (auctionId) {
    condiciones.push('rv.auction_id = ?');
    parametros.push(Number(auctionId));
  }
  if (targetUserId) {
    condiciones.push('rv.target_user_id = ?');
    parametros.push(Number(targetUserId));
  }
  if (reviewerId) {
    condiciones.push('rv.reviewer_id = ?');
    parametros.push(Number(reviewerId));
  }

  const dondeSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await query(
    `SELECT
       rv.*,
       a.title AS auction_title,
       u_rev.name AS reviewer_name,
       u_tgt.name AS target_user_name
     FROM reviews rv
     INNER JOIN auctions a ON a.id = rv.auction_id
     INNER JOIN users u_rev ON u_rev.id = rv.reviewer_id
     INNER JOIN users u_tgt ON u_tgt.id = rv.target_user_id
     ${dondeSql}
     ORDER BY rv.created_at DESC, rv.id DESC`,
    parametros,
    connection
  );
  return filas.map(mapReviewRow);
}

// Busca una calificación por ID
export async function findById(id, connection) {
  const filas = await query(
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
  return mapReviewRow(filas[0]);
}

// Verifica si un usuario ya calificó una subasta específica (RN07: Calificación única)
export async function existsByAuctionAndReviewer(conn, auctionId, reviewerId) {
  const filas = await query(
    'SELECT id FROM reviews WHERE auction_id = ? AND reviewer_id = ? LIMIT 1',
    [Number(auctionId), Number(reviewerId)],
    conn
  );
  return filas.length > 0;
}

// Recalcula y actualiza la reputación promedio de un usuario en la tabla users
export async function recalculateUserReputation(conn, targetUserId) {
  const filas = await query(
    'SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total FROM reviews WHERE target_user_id = ?',
    [Number(targetUserId)],
    conn
  );
  const total = Number(filas[0]?.total || 0);
  const nuevaReputacion = total > 0 ? Number(filas[0].avg_rating) : 5.0;
  await query(
    'UPDATE users SET reputation = ? WHERE id = ?',
    [nuevaReputacion, Number(targetUserId)],
    conn
  );
  return nuevaReputacion;
}

// Inserta una nueva calificación en la base de datos
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
  const resultado = await query(
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
  return findById(resultado.insertId, conn);
}

// Actualiza los campos de una calificación existente
export async function update(conn, id, fields) {
  const mapaColumnas = {
    rating: 'rating',
    comment: 'comment',
    roleContext: 'role_context',
  };

  const clausulasSet = [];
  const parametros = [];

  for (const [clave, columna] of Object.entries(mapaColumnas)) {
    if (fields[clave] !== undefined) {
      clausulasSet.push(`${columna} = ?`);
      parametros.push(fields[clave]);
    }
  }

  if (clausulasSet.length === 0) return findById(id, conn);

  parametros.push(Number(id));
  await query(`UPDATE reviews SET ${clausulasSet.join(', ')} WHERE id = ?`, parametros, conn);
  return findById(id, conn);
}

// Elimina una calificación por ID
export async function remove(conn, id) {
  const resultado = await query('DELETE FROM reviews WHERE id = ?', [Number(id)], conn);
  return resultado.affectedRows > 0;
}
