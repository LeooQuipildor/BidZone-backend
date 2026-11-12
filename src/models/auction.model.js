import { query, withTransaction } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

const SORT_CLAUSES = {
  endingSoon: "a.status = 'activa' DESC, a.end_time ASC, a.id DESC",
  priceAsc: 'a.current_price ASC, a.id DESC',
  priceDesc: 'a.current_price DESC, a.id DESC',
  newest: 'a.created_at DESC, a.id DESC',
};

export function mapAuctionRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    basePrice: Number(row.base_price),
    currentPrice: Number(row.current_price),
    minIncrement: Number(row.min_increment),
    sellerId: Number(row.seller_id),
    winnerId: row.winner_id !== null && row.winner_id !== undefined ? Number(row.winner_id) : null,
    status: row.status,
    endTime: toIsoUtc(row.end_time),
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
    bidCount: row.bid_count !== undefined ? Number(row.bid_count) : undefined,
    sellerName: row.seller_name ?? undefined,
    sellerCity: row.seller_city ?? undefined,
    sellerReputation:
      row.seller_reputation !== undefined ? Number(row.seller_reputation) : undefined,
    winnerName: row.winner_name ?? undefined,
  };
}

export async function syncExpiredAuctions() {
  const expiredCheck = await query(
    `SELECT id FROM auctions WHERE status = 'activa' AND end_time <= UTC_TIMESTAMP() LIMIT 1`
  );
  if (expiredCheck.length === 0) return 0;

  return withTransaction(async (conn) => {
    const expiredAuctions = await query(
      `SELECT id, title, seller_id
       FROM auctions
       WHERE status = 'activa' AND end_time <= UTC_TIMESTAMP()
       FOR UPDATE`,
      [],
      conn
    );

    let closedCount = 0;
    for (const auction of expiredAuctions) {
      const topBids = await query(
        `SELECT bidder_id, amount
         FROM bids
         WHERE auction_id = ?
         ORDER BY amount DESC, id ASC
         LIMIT 1`,
        [auction.id],
        conn
      );
      const topBid = topBids[0] || null;

      await query(
        `UPDATE auctions SET status = 'finalizada', winner_id = ? WHERE id = ?`,
        [topBid ? topBid.bidder_id : null, auction.id],
        conn
      );

      if (topBid) {
        await query(
          `INSERT INTO notifications (user_id, auction_id, title, message, type)
           VALUES (?, ?, ?, ?, 'won')`,
          [
            topBid.bidder_id,
            auction.id,
            '¡Subasta ganada! Datos de contacto liberados',
            `Resultaste ganador de "${auction.title}" con $${Number(topBid.amount).toLocaleString('es-AR')}. Ya puedes ver los datos de contacto del vendedor.`,
          ],
          conn
        );

        await query(
          `INSERT INTO notifications (user_id, auction_id, title, message, type)
           VALUES (?, ?, ?, ?, 'closed')`,
          [
            auction.seller_id,
            auction.id,
            'Subasta finalizada con ganador',
            `Tu subasta "${auction.title}" cerró en $${Number(topBid.amount).toLocaleString('es-AR')}. Ingresa al detalle para coordinar la entrega.`,
          ],
          conn
        );
      }

      closedCount += 1;
    }
    return closedCount;
  });
}

export async function findAll(
  { category, status, search, sellerId, sortBy = 'endingSoon' } = {},
  connection
) {
  const conditions = [];
  const params = [];

  if (category && category !== 'Todas') {
    conditions.push('a.category = ?');
    params.push(category);
  }
  if (status && status !== 'todas') {
    conditions.push('a.status = ?');
    params.push(status);
  }
  if (sellerId) {
    conditions.push('a.seller_id = ?');
    params.push(Number(sellerId));
  }
  if (search && String(search).trim() !== '') {
    const escaped = String(search).trim().replace(/[\\%_]/g, '\\$&');
    const pattern = `%${escaped}%`;
    conditions.push('(a.title LIKE ? OR a.description LIKE ? OR a.category LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause = SORT_CLAUSES[sortBy] || SORT_CLAUSES.endingSoon;

  const rows = await query(
    `SELECT
       a.*,
       s.name AS seller_name,
       s.city AS seller_city,
       s.reputation AS seller_reputation,
       w.name AS winner_name,
       COALESCE(bc.bid_count, 0) AS bid_count
     FROM auctions a
     INNER JOIN users s ON s.id = a.seller_id
     LEFT JOIN users w ON w.id = a.winner_id
     LEFT JOIN (
       SELECT auction_id, COUNT(*) AS bid_count
       FROM bids
       GROUP BY auction_id
     ) bc ON bc.auction_id = a.id
     ${whereClause}
     ORDER BY ${orderClause}`,
    params,
    connection
  );

  return rows.map(mapAuctionRow);
}

export async function findByIdRaw(id, connection) {
  const rows = await query(
    `SELECT
       a.*,
       s.name AS seller_name,
       s.email AS seller_email,
       s.phone AS seller_phone,
       s.city AS seller_city,
       s.reputation AS seller_reputation,
       w.name AS winner_name,
       w.email AS winner_email,
       w.phone AS winner_phone,
       w.city AS winner_city,
       w.reputation AS winner_reputation,
       (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     INNER JOIN users s ON s.id = a.seller_id
     LEFT JOIN users w ON w.id = a.winner_id
     WHERE a.id = ?
     LIMIT 1`,
    [Number(id)],
    connection
  );
  return rows[0] || null;
}

export async function findById(id, connection) {
  const row = await findByIdRaw(id, connection);
  return mapAuctionRow(row);
}

export async function findByIdForUpdate(conn, id) {
  const rows = await query(
    'SELECT * FROM auctions WHERE id = ? LIMIT 1 FOR UPDATE',
    [Number(id)],
    conn
  );
  return rows[0] || null;
}

export async function countBids(id, connection) {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM bids WHERE auction_id = ?',
    [Number(id)],
    connection
  );
  return Number(rows[0]?.total || 0);
}

export async function create(
  {
    title,
    description = '',
    category = 'Tecnología',
    imageUrl = '',
    basePrice,
    minIncrement,
    sellerId,
    status = 'activa',
    endTime,
  },
  connection
) {
  const result = await query(
    `INSERT INTO auctions (
       title, description, category, image_url,
       base_price, current_price, min_increment,
       seller_id, winner_id, status, end_time
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      title,
      description,
      category,
      imageUrl,
      Number(basePrice),
      Number(basePrice),
      Number(minIncrement),
      Number(sellerId),
      status,
      endTime,
    ],
    connection
  );
  return findById(result.insertId, connection);
}

export async function update(id, fields, connection) {
  const allowedColumnMap = {
    title: 'title',
    description: 'description',
    category: 'category',
    imageUrl: 'image_url',
    basePrice: 'base_price',
    currentPrice: 'current_price',
    minIncrement: 'min_increment',
    winnerId: 'winner_id',
    status: 'status',
    endTime: 'end_time',
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
    return findById(id, connection);
  }

  params.push(Number(id));
  await query(
    `UPDATE auctions SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
    connection
  );
  return findById(id, connection);
}

export async function remove(id, connection) {
  const result = await query(
    'DELETE FROM auctions WHERE id = ?',
    [Number(id)],
    connection
  );
  return result.affectedRows > 0;
}

