import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

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

export async function findAll({ auctionId, bidderId } = {}, connection) {
  const conditions = [];
  const params = [];

  if (auctionId) {
    conditions.push('b.auction_id = ?');
    params.push(Number(auctionId));
  }
  if (bidderId) {
    conditions.push('b.bidder_id = ?');
    params.push(Number(bidderId));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT
       b.*,
       u.name AS bidder_name,
       a.title AS auction_title
     FROM bids b
     INNER JOIN users u ON u.id = b.bidder_id
     INNER JOIN auctions a ON a.id = b.auction_id
     ${whereClause}
     ORDER BY b.created_at DESC, b.id DESC`,
    params,
    connection
  );
  return rows.map(mapBidRow);
}

export async function findById(id, connection) {
  const rows = await query(
    `SELECT
       b.*,
       u.name AS bidder_name,
       a.title AS auction_title
     FROM bids b
     INNER JOIN users u ON u.id = b.bidder_id
     INNER JOIN auctions a ON a.id = b.auction_id
     WHERE b.id = ?
     LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapBidRow(rows[0]);
}

export async function findTopBidByAuction(conn, auctionId) {
  const rows = await query(
    `SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC, id ASC LIMIT 1`,
    [Number(auctionId)],
    conn
  );
  return rows[0] ? mapBidRow(rows[0]) : null;
}

export async function create(
  conn,
  { auctionId, bidderId, amount, note = '', commitmentAccepted = true }
) {
  const result = await query(
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
  return findById(result.insertId, conn);
}

export async function update(conn, id, fields) {
  const allowedColumnMap = {
    amount: 'amount',
    note: 'note',
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
    `UPDATE bids SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
    conn
  );
  return findById(id, conn);
}

export async function remove(conn, id) {
  const result = await query(
    'DELETE FROM bids WHERE id = ?',
    [Number(id)],
    conn
  );
  return result.affectedRows > 0;
}

export async function recalculateAuctionPrice(conn, auctionId) {
  const rows = await query(
    `SELECT
       a.base_price,
       (SELECT MAX(b.amount) FROM bids b WHERE b.auction_id = a.id) AS max_bid
     FROM auctions a
     WHERE a.id = ?
     LIMIT 1`,
    [Number(auctionId)],
    conn
  );
  if (!rows[0]) return null;

  const newPrice =
    rows[0].max_bid !== null && rows[0].max_bid !== undefined
      ? Math.max(Number(rows[0].base_price), Number(rows[0].max_bid))
      : Number(rows[0].base_price);

  await query(
    'UPDATE auctions SET current_price = ? WHERE id = ?',
    [newPrice, Number(auctionId)],
    conn
  );
  return newPrice;
}

