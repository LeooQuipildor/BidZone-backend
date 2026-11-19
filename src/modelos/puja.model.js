import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de puja al objeto JSON en español
export function formatearPuja(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    subastaId: Number(fila.subasta_id),
    postorId: Number(fila.postor_id),
    monto: Number(fila.monto),
    nota: fila.nota ?? '',
    compromisoAceptado: Boolean(fila.compromiso_aceptado),
    creadoEn: aFechaIso(fila.creado_en),
    nombrePostor: fila.postor_nombre ?? undefined,
    tituloSubasta: fila.subasta_titulo ?? undefined,
  };
}

// Lista pujas filtrando opcionalmente por subasta o por postor
export async function listarTodas({ subastaId, postorId } = {}) {
  const filtros = [];
  const valores = [];

  if (subastaId) {
    filtros.push('p.subasta_id = ?');
    valores.push(Number(subastaId));
  }
  if (postorId) {
    filtros.push('p.postor_id = ?');
    valores.push(Number(postorId));
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT p.*, u.nombre AS postor_nombre, s.titulo AS subasta_titulo
     FROM pujas p
     INNER JOIN usuarios u ON u.id = p.postor_id
     INNER JOIN subastas s ON s.id = p.subasta_id
     ${where}
     ORDER BY p.creado_en DESC, p.id DESC`,
    valores
  );
  return filas.map(formatearPuja);
}

// Busca una puja por ID
export async function buscarPorId(id, conexion) {
  const filas = await consultar(
    `SELECT p.*, u.nombre AS postor_nombre, s.titulo AS subasta_titulo
     FROM pujas p
     INNER JOIN usuarios u ON u.id = p.postor_id
     INNER JOIN subastas s ON s.id = p.subasta_id
     WHERE p.id = ? LIMIT 1`,
    [Number(id)],
    conexion
  );
  return formatearPuja(filas[0]);
}

// Devuelve la oferta más alta actual de una subasta
export async function buscarOfertaLider(conexion, subastaId) {
  const filas = await consultar(
    `SELECT * FROM pujas WHERE subasta_id = ? ORDER BY monto DESC, id ASC LIMIT 1`,
    [Number(subastaId)],
    conexion
  );
  return formatearPuja(filas[0]);
}

// Inserta una puja nueva dentro de la transacción
export async function crear(conexion, datos) {
  const resultado = await consultar(
    `INSERT INTO pujas (subasta_id, postor_id, monto, nota, compromiso_aceptado)
     VALUES (?, ?, ?, ?, 1)`,
    [Number(datos.subastaId), Number(datos.postorId), Number(datos.monto), datos.nota || ''],
    conexion
  );
  return buscarPorId(resultado.insertId, conexion);
}

// Actualiza nota o monto de una puja
export async function actualizar(conexion, id, campos) {
  const partes = [];
  const valores = [];

  if (campos.monto !== undefined) {
    partes.push('monto = ?');
    valores.push(campos.monto);
  }
  if (campos.nota !== undefined) {
    partes.push('nota = ?');
    valores.push(campos.nota);
  }

  if (partes.length > 0) {
    valores.push(Number(id));
    await consultar(`UPDATE pujas SET ${partes.join(', ')} WHERE id = ?`, valores, conexion);
  }
  return buscarPorId(id, conexion);
}

// Elimina una puja por ID
export async function eliminar(conexion, id) {
  const resultado = await consultar('DELETE FROM pujas WHERE id = ?', [Number(id)], conexion);
  return resultado.affectedRows > 0;
}

// Recalcula el precio actual de la subasta cuando se modifica o borra una puja
export async function recalcularPrecioSubasta(conexion, subastaId) {
  const filas = await consultar(
    `SELECT s.precio_base, (SELECT MAX(p.monto) FROM pujas p WHERE p.subasta_id = s.id) AS max_puja
     FROM subastas s WHERE s.id = ? LIMIT 1`,
    [Number(subastaId)],
    conexion
  );
  if (!filas[0]) return null;

  const maximo = filas[0].max_puja != null ? Number(filas[0].max_puja) : 0;
  const nuevoPrecio = Math.max(Number(filas[0].precio_base), maximo);
  await consultar('UPDATE subastas SET precio_actual = ? WHERE id = ?', [nuevoPrecio, Number(subastaId)], conexion);
  return nuevoPrecio;
}
