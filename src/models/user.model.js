import { query } from '../config/db.js';
import { toIsoUtc } from '../utils/date.js';

const COLUMNAS_SEGURAS_USUARIO = `
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

// Convierte una fila SQL cruda en un objeto Usuario seguro (nunca expone password_hash)
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

// Lista los usuarios aplicando filtros de rol, estado o búsqueda por texto
export async function findAll({ role, status, search } = {}, connection) {
  const condiciones = [];
  const parametros = [];

  if (role) {
    condiciones.push('role = ?');
    parametros.push(role);
  }
  if (status) {
    condiciones.push('status = ?');
    parametros.push(status);
  }
  if (search && String(search).trim() !== '') {
    const patron = `%${String(search).trim()}%`;
    condiciones.push('(name LIKE ? OR email LIKE ? OR city LIKE ?)');
    parametros.push(patron, patron, patron);
  }

  const dondeSql = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  const filas = await query(
    `SELECT ${COLUMNAS_SEGURAS_USUARIO} FROM users ${dondeSql} ORDER BY id DESC`,
    parametros,
    connection
  );
  return filas.map(mapUserRow);
}

// Busca un usuario por ID
export async function findById(id, connection) {
  const filas = await query(
    `SELECT ${COLUMNAS_SEGURAS_USUARIO} FROM users WHERE id = ? LIMIT 1`,
    [Number(id)],
    connection
  );
  return mapUserRow(filas[0]);
}

// Busca un usuario para autenticación (incluye password_hash para bcrypt)
export async function findAuthByEmail(email, connection) {
  const filas = await query(
    `SELECT ${COLUMNAS_SEGURAS_USUARIO}, password_hash FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [String(email).trim()],
    connection
  );
  if (!filas[0]) return null;
  return {
    ...mapUserRow(filas[0]),
    passwordHash: filas[0].password_hash,
  };
}

// Comprueba si un correo electrónico ya está registrado
export async function existsByEmail(email, excludeUserId = null, connection) {
  const parametros = [String(email).trim()];
  let sql = 'SELECT id FROM users WHERE LOWER(email) = LOWER(?)';
  if (excludeUserId) {
    sql += ' AND id <> ?';
    parametros.push(Number(excludeUserId));
  }
  sql += ' LIMIT 1';
  const filas = await query(sql, parametros, connection);
  return filas.length > 0;
}

// Inserta un nuevo usuario en la base de datos
export async function create(
  { name, email, passwordHash, role = 'user', phone = '', city = '', status = 'active', reputation = 5.0 },
  connection
) {
  const resultado = await query(
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
  return findById(resultado.insertId, connection);
}

// Actualiza los datos de un usuario existente
export async function update(id, fields, connection) {
  const mapaColumnas = {
    name: 'name',
    email: 'email',
    passwordHash: 'password_hash',
    role: 'role',
    phone: 'phone',
    city: 'city',
    status: 'status',
    reputation: 'reputation',
  };

  const clausulasSet = [];
  const parametros = [];

  for (const [clave, columna] of Object.entries(mapaColumnas)) {
    if (fields[clave] !== undefined) {
      clausulasSet.push(`${columna} = ?`);
      parametros.push(clave === 'email' ? String(fields[clave]).toLowerCase() : fields[clave]);
    }
  }

  if (clausulasSet.length === 0) return findById(id, connection);

  parametros.push(Number(id));
  await query(`UPDATE users SET ${clausulasSet.join(', ')} WHERE id = ?`, parametros, connection);
  return findById(id, connection);
}

// Elimina un usuario por ID
export async function remove(id, connection) {
  const resultado = await query('DELETE FROM users WHERE id = ?', [Number(id)], connection);
  return resultado.affectedRows > 0;
}

// Obtiene los IDs de usuarios con los que se concretó una subasta finalizada (RN05)
export async function getFinalizedPartnerIds(userId, connection) {
  const filas = await query(
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
  return new Set(filas.map((r) => Number(r.partner_id)));
}
