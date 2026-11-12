import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

// Convierte una fila SQL cruda en un objeto Reporte estándar para la API
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

// Lista los expedientes de mediación aplicando filtros opcionales
export async function findAll({ status, auctionId, participantUserId } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (status && status !== 'todos') {
    condiciones.push('r.status = ?');
    parametros.push(status);
  }
  if (auctionId) {
    condiciones.push('r.auction_id = ?');
    parametros.push(Number(auctionId));
  }
  if (participantUserId) {
    condiciones.push('(r.reporter_id = ? OR r.reported_user_id = ?)');
    parametros.push(Number(participantUserId), Number(participantUserId));
  }

  const dondeSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await query(
    `SELECT
       r.*,
       a.title AS auction_title,
       u_rep.name AS reporter_name,
       u_inf.name AS reported_user_name
     FROM reports r
     INNER JOIN auctions a ON a.id = r.auction_id
     INNER JOIN users u_rep ON u_rep.id = r.reporter_id
     INNER JOIN users u_inf ON u_inf.id = r.reported_user_id
     ${dondeSql}
     ORDER BY r.created_at DESC, r.id DESC`,
    parametros,
    connection
  );
  return filas.map(mapReportRow);
}

// Busca un reporte específico por su ID
export async function findById(id, connection) {
  const filas = await query(
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
  return mapReportRow(filas[0]);
}

// Inserta un nuevo reporte en la base de datos
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
  const resultado = await query(
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
  return findById(resultado.insertId, conn);
}

// Actualiza los campos de un reporte existente
export async function update(conn, id, fields) {
  const mapaColumnas = {
    reason: 'reason',
    description: 'description',
    evidenceUrl: 'evidence_url',
    status: 'status',
    sanctionApplied: 'sanction_applied',
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
  await query(`UPDATE reports SET ${clausulasSet.join(', ')} WHERE id = ?`, parametros, conn);
  return findById(id, conn);
}

// Elimina un reporte por su ID
export async function remove(id, connection) {
  const resultado = await query('DELETE FROM reports WHERE id = ?', [Number(id)], connection);
  return resultado.affectedRows > 0;
}
