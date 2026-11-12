import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

// Convierte una fila SQL cruda en un objeto Puja estándar para la API
export function mapBidRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    auctionId: Number(row.auction_id),
    bidderId: Number(row.bidder_id),
    amount: Number(row.amount),
    note: row.note ?? '',
    commitmentAccepted: Boolean(row.commitment_accepted),
    createdAt: toIsoUtc(row.created_at),
    bidderName: row.bidder_name ?? undefined,
    auctionTitle: row.auction_title ?? undefined,
  };
}

// Lista todas las pujas aplicando filtros opcionales de subasta o postor
export async function findAll({ auctionId, bidderId } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (auctionId) {
    condiciones.push('b.auction_id = ?');
    parametros.push(Number(auctionId));
  }
  if (bidderId) {
    condiciones.push('b.bidder_id = ?');
    parametros.push(Number(bidderId));
  }

  const dondeSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await query(
    `SELECT b.*, u.name AS bidder_name, a.title AS auction_title
     FROM bids b
     INNER JOIN users u ON u.id = b.bidder_id
     INNER JOIN auctions a ON a.id = b.auction_id
     ${dondeSql}
     ORDER BY b.created_at DESC, b.id DESC`,
    parametros,
    connection
  );
  return filas.map(mapBidRow);
}

// Busca una puja específica por su ID
export async function findById(id, connection) {
  const filas = await query(
    `SELECT b.*, u.name AS bidder_name, a.title AS auction_title
     FROM bids b
     INNER JOIN users u ON u.id = b.bidder_id
     INNER JOIN auctions a ON a.id = b.auction_id
     WHERE b.id = ?
     LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapBidRow(filas[0]);
}

// Obtiene la oferta más alta actual de una subasta
export async function findTopBidByAuction(conn, auctionId) {
  const filas = await query(
    `SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC, id ASC LIMIT 1`,
    [Number(auctionId)],
    conn
  );
  return filas[0] ? mapBidRow(filas[0]) : null;
}

// Inserta una nueva puja en la base de datos
export async function create(
  conn,
  { auctionId, bidderId, amount, note = '', commitmentAccepted = true }
) {
  const resultado = await query(
    `INSERT INTO bids (auction_id, bidder_id, amount, note, commitment_accepted)
     VALUES (?, ?, ?, ?, ?)`,
    [
      Number(auctionId),
      Number(bidderId),
      Number(amount),
      note,
      commitmentAccepted ? 1 : 0,
    ],
    conn
  );
  return findById(resultado.insertId, conn);
}

// Actualiza los campos de una puja
export async function update(conn, id, fields) {
  const mapaColumnas = {
    amount: 'amount',
    note: 'note',
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
  await query(`UPDATE bids SET ${clausulasSet.join(', ')} WHERE id = ?`, parametros, conn);
  return findById(id, conn);
}

// Elimina una puja por su ID
export async function remove(conn, id) {
  const resultado = await query('DELETE FROM bids WHERE id = ?', [Number(id)], conn);
  return resultado.affectedRows > 0;
}

// Recalcula el precio actual de la subasta según su oferta más alta o precio base
export async function recalculateAuctionPrice(conn, auctionId) {
  const filas = await query(
    `SELECT a.base_price, (SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = a.id) AS max_bid
     FROM auctions a
     WHERE a.id = ?
     LIMIT 1`,
    [Number(auctionId)],
    conn
  );
  if (!filas[0]) return null;

  const nuevoPrecio =
    filas[0].max_bid !== null && filas[0].max_bid !== undefined
      ? Math.max(Number(filas[0].base_price), Number(filas[0].max_bid))
      : Number(filas[0].base_price);

  await query('UPDATE auctions SET current_price = ? WHERE id = ?', [nuevoPrecio, Number(auctionId)], conn);
  return nuevoPrecio;
}
