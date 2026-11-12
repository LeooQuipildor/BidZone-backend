import { query, withTransaction } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

const CLAUSULAS_ORDEN = {
  endingSoon: "a.status = 'activa' DESC, a.end_time ASC, a.id DESC",
  priceAsc: 'a.current_price ASC, a.id DESC',
  priceDesc: 'a.current_price DESC, a.id DESC',
  newest: 'a.created_at DESC, a.id DESC',
};

// Convierte una fila SQL cruda en un objeto subasta estándar para la API
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
    sellerReputation: row.seller_reputation !== undefined ? Number(row.seller_reputation) : undefined,
    winnerName: row.winner_name ?? undefined,
  };
}

// Cierra automáticamente las subastas expiradas y asigna al ganador (RN03)
export async function syncExpiredAuctions() {
  const expiradasCheck = await query(
    `SELECT id FROM auctions WHERE status = 'activa' AND end_time <= UTC_TIMESTAMP() LIMIT 1`
  );
  if (expiradasCheck.length === 0) return 0;

  return withTransaction(async (conn) => {
    const expiradas = await query(
      `SELECT id, title, seller_id FROM auctions WHERE status = 'activa' AND end_time <= UTC_TIMESTAMP() FOR UPDATE`,
      [],
      conn
    );

    for (const subasta of expiradas) {
      const mejores = await query(
        `SELECT bidder_id, amount FROM bids WHERE auction_id = ? ORDER BY amount DESC, id ASC LIMIT 1`,
        [subasta.id],
        conn
      );
      const topBid = mejores[0] || null;

      await query(
        `UPDATE auctions SET status = 'finalizada', winner_id = ? WHERE id = ?`,
        [topBid ? topBid.bidder_id : null, subasta.id],
        conn
      );

      if (topBid) {
        await query(
          `INSERT INTO notifications (user_id, auction_id, title, message, type) VALUES (?, ?, ?, ?, 'won')`,
          [topBid.bidder_id, subasta.id, '¡Subasta ganada! Datos de contacto liberados', `Resultaste ganador de "${subasta.title}".`],
          conn
        );
        await query(
          `INSERT INTO notifications (user_id, auction_id, title, message, type) VALUES (?, ?, ?, ?, 'closed')`,
          [subasta.seller_id, subasta.id, 'Subasta finalizada con ganador', `Tu subasta "${subasta.title}" cerró con un ganador.`],
          conn
        );
      }
    }
    return expiradas.length;
  });
}

// Lista todas las subastas con filtros y ordenamiento
export async function findAll({ category, status, search, sellerId, sortBy = 'endingSoon' } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (category && category !== 'Todas') {
    condiciones.push('a.category = ?');
    parametros.push(category);
  }
  if (status && status !== 'todas') {
    condiciones.push('a.status = ?');
    parametros.push(status);
  }
  if (sellerId) {
    condiciones.push('a.seller_id = ?');
    parametros.push(Number(sellerId));
  }
  if (search && String(search).trim() !== '') {
    const patron = `%${String(search).trim()}%`;
    condiciones.push('(a.title LIKE ? OR a.description LIKE ? OR a.category LIKE ?)');
    parametros.push(patron, patron, patron);
  }

  const whereSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const ordenSql = CLAUSULAS_ORDEN[sortBy] || CLAUSULAS_ORDEN.endingSoon;

  const filas = await query(
    `SELECT a.*, s.name AS seller_name, s.city AS seller_city, s.reputation AS seller_reputation,
       w.name AS winner_name, COALESCE(bc.bid_count, 0) AS bid_count
     FROM auctions a
     INNER JOIN users s ON s.id = a.seller_id
     LEFT JOIN users w ON w.id = a.winner_id
     LEFT JOIN (SELECT auction_id, COUNT(*) AS bid_count FROM bids GROUP BY auction_id) bc ON bc.auction_id = a.id
     ${whereSql}
     ORDER BY ${ordenSql}`,
    parametros,
    connection
  );

  return filas.map(mapAuctionRow);
}

// Busca una subasta por ID con datos completos de vendedor y ganador
export async function findByIdRaw(id, connection) {
  const filas = await query(
    `SELECT a.*, s.name AS seller_name, s.email AS seller_email, s.phone AS seller_phone,
       s.city AS seller_city, s.reputation AS seller_reputation,
       w.name AS winner_name, w.email AS winner_email, w.phone AS winner_phone,
       w.city AS winner_city, w.reputation AS winner_reputation,
       (SELECT COUNT(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
     FROM auctions a
     INNER JOIN users s ON s.id = a.seller_id
     LEFT JOIN users w ON w.id = a.winner_id
     WHERE a.id = ? LIMIT 1`,
    [Number(id)],
    connection
  );
  return filas[0] || null;
}

export async function findById(id, connection) {
  const fila = await findByIdRaw(id, connection);
  return mapAuctionRow(fila);
}

export async function findByIdForUpdate(conn, id) {
  const filas = await query('SELECT * FROM auctions WHERE id = ? LIMIT 1 FOR UPDATE', [Number(id)], conn);
  return filas[0] || null;
}

export async function countBids(id, connection) {
  const filas = await query('SELECT COUNT(*) AS total FROM bids WHERE auction_id = ?', [Number(id)], connection);
  return Number(filas[0]?.total || 0);
}

// Inserta una nueva subasta en la base de datos
export async function create(datos, connection) {
  const resultado = await query(
    `INSERT INTO auctions (
       title, description, category, image_url,
       base_price, current_price, min_increment,
       seller_id, winner_id, status, end_time
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      datos.title,
      datos.description || '',
      datos.category || 'Tecnología',
      datos.imageUrl || '',
      Number(datos.basePrice),
      Number(datos.basePrice),
      Number(datos.minIncrement),
      Number(datos.sellerId),
      datos.status || 'activa',
      datos.endTime,
    ],
    connection
  );
  return findById(resultado.insertId, connection);
}

// Actualiza los campos modificados de una subasta
export async function update(id, campos, connection) {
  const mapaColumnas = {
    title: 'title', description: 'description', category: 'category',
    imageUrl: 'image_url', basePrice: 'base_price', currentPrice: 'current_price',
    minIncrement: 'min_increment', winnerId: 'winner_id', status: 'status', endTime: 'end_time',
  };

  const clausulasSet = [];
  const parametros = [];
  for (const [clave, columna] of Object.entries(mapaColumnas)) {
    if (campos[clave] !== undefined) {
      clausulasSet.push(`${columna} = ?`);
      parametros.push(campos[clave]);
    }
  }

  if (clausulasSet.length > 0) {
    parametros.push(Number(id));
    await query(`UPDATE auctions SET ${clausulasSet.join(', ')} WHERE id = ?`, parametros, connection);
  }

  return findById(id, connection);
}

// Elimina una subasta por ID
export async function remove(id, connection) {
  const resultado = await query('DELETE FROM auctions WHERE id = ?', [Number(id)], connection);
  return resultado.affectedRows > 0;
}
