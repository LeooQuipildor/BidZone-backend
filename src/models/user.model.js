import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

const SAFE_USER_COLUMNS = `
  id,
  name,
  email,
  role,
  phone,
  city,
  status,
  reputation,
  created_at,
  updated_at
`;

export function mapUserRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    phone: row.phone ?? '',
    city: row.city ?? '',
    status: row.status,
    reputation: Number(row.reputation ?? 5),
    createdAt: toIsoUtc(row.created_at),
    updatedAt: toIsoUtc(row.updated_at),
  };
}

export async function findAll({ role, status, search } = {}, connection) {
  const conditions = [];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search && String(search).trim() !== '') {
    const escaped = String(search).trim().replace(/[\\%_]/g, '\\$&');
    const pattern = `%${escaped}%`;
    conditions.push('(name LIKE ? OR email LIKE ? OR city LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = await query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users ${whereClause} ORDER BY id DESC`,
    params,
    connection
  );
  return rows.map(mapUserRow);
}

export async function findById(id, connection) {
  const rows = await query(
    `SELECT ${SAFE_USER_COLUMNS} FROM users WHERE id = ? LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapUserRow(rows[0]);
}

export async function findAuthByEmail(email, connection) {
  const rows = await query(
    `SELECT ${SAFE_USER_COLUMNS}, password_hash FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [String(email).trim()],
    connection
  );
  if (!rows[0]) return null;
  return {
    ...mapUserRow(rows[0]),
    passwordHash: rows[0].password_hash,
  };
}

export async function existsByEmail(email, excludeUserId = null, connection) {
  const params = [String(email).trim()];
  let sql = 'SELECT id FROM users WHERE LOWER(email) = LOWER(?)';
  if (excludeUserId) {
    sql += ' AND id <> ?';
    params.push(Number(excludeUserId));
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params, connection);
  return rows.length > 0;
}

export async function create(
  { name, email, passwordHash, role = 'user', phone = '', city = '', status = 'active', reputation = 5.0 },
  connection
) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, phone, city, status, reputation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      email.toLowerCase(),
      passwordHash,
      role,
      phone,
      city,
      status,
      Number(reputation),
    ],
    connection
  );
  return findById(result.insertId, connection);
}

export async function update(id, fields, connection) {
  const allowedColumnMap = {
    name: 'name',
    email: 'email',
    passwordHash: 'password_hash',
    role: 'role',
    phone: 'phone',
    city: 'city',
    status: 'status',
    reputation: 'reputation',
  };

  const setClauses = [];
  const params = [];

  for (const [key, column] of Object.entries(allowedColumnMap)) {
    if (fields[key] !== undefined) {
      setClauses.push(`${column} = ?`);
      params.push(key === 'email' ? String(fields[key]).toLowerCase() : fields[key]);
    }
  }

  if (setClauses.length === 0) {
    return findById(id, connection);
  }

  params.push(Number(id));
  await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
    params,
    connection
  );
  return findById(id, connection);
}

export async function remove(id, connection) {
  const result = await query(
    'DELETE FROM users WHERE id = ?',
    [Number(id)],
    connection
  );
  return result.affectedRows > 0;
}

export async function getFinalizedPartnerIds(userId, connection) {
  const rows = await query(
    `SELECT DISTINCT
       CASE
         WHEN seller_id = ? THEN winner_id
         ELSE seller_id
       END AS partner_id
     FROM auctions
     WHERE status = 'finalizada'
       AND winner_id IS NOT NULL
       AND (seller_id = ? OR winner_id = ?)`,
    [Number(userId), Number(userId), Number(userId)],
    connection
  );
  return new Set(rows.map((r) => Number(r.partner_id)));
}

