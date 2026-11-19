import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de reseña al formato JSON de la API
export function formatearResena(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    auctionId: Number(fila.subasta_id),
    reviewerId: Number(fila.autor_id),
    targetUserId: Number(fila.calificado_id),
    rating: Number(fila.puntaje),
    comment: fila.comentario,
    roleContext: fila.contexto_rol,
    createdAt: aFechaIso(fila.creado_en),
    updatedAt: aFechaIso(fila.actualizado_en),
    auctionTitle: fila.subasta_titulo ?? undefined,
    reviewerName: fila.autor_nombre ?? undefined,
    targetUserName: fila.calificado_nombre ?? undefined,
  };
}

// Lista reseñas filtrando por subasta, calificado o autor
export async function listarTodas({ auctionId, targetUserId, reviewerId } = {}) {
  const filtros = [];
  const valores = [];

  if (auctionId) {
    filtros.push('rs.subasta_id = ?');
    valores.push(Number(auctionId));
  }
  if (targetUserId) {
    filtros.push('rs.calificado_id = ?');
    valores.push(Number(targetUserId));
  }
  if (reviewerId) {
    filtros.push('rs.autor_id = ?');
    valores.push(Number(reviewerId));
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT rs.*, s.titulo AS subasta_titulo, u1.nombre AS autor_nombre, u2.nombre AS calificado_nombre
     FROM resenas rs
     INNER JOIN subastas s ON s.id = rs.subasta_id
     INNER JOIN usuarios u1 ON u1.id = rs.autor_id
     INNER JOIN usuarios u2 ON u2.id = rs.calificado_id
     ${where}
     ORDER BY rs.creado_en DESC, rs.id DESC`,
    valores
  );
  return filas.map(formatearResena);
}

// Busca una reseña por su ID
export async function buscarPorId(id, conexion) {
  const filas = await consultar(
    `SELECT rs.*, s.titulo AS subasta_titulo, u1.nombre AS autor_nombre, u2.nombre AS calificado_nombre
     FROM resenas rs
     INNER JOIN subastas s ON s.id = rs.subasta_id
     INNER JOIN usuarios u1 ON u1.id = rs.autor_id
     INNER JOIN usuarios u2 ON u2.id = rs.calificado_id
     WHERE rs.id = ? LIMIT 1`,
    [Number(id)],
    conexion
  );
  return formatearResena(filas[0]);
}

// Verifica si un usuario ya calificó esa subasta (RN07)
export async function yaCalifico(conexion, idSubasta, idAutor) {
  const filas = await consultar(
    'SELECT id FROM resenas WHERE subasta_id = ? AND autor_id = ? LIMIT 1',
    [Number(idSubasta), Number(idAutor)],
    conexion
  );
  return filas.length > 0;
}

// Recalcula el promedio de estrellas de un usuario y lo guarda en la tabla usuarios
export async function recalcularReputacion(conexion, idUsuario) {
  const filas = await consultar(
    'SELECT ROUND(AVG(puntaje), 2) AS promedio, COUNT(*) AS total FROM resenas WHERE calificado_id = ?',
    [Number(idUsuario)],
    conexion
  );
  const nuevaReputacion = Number(filas[0]?.total) > 0 ? Number(filas[0].promedio) : 5.0;
  await consultar('UPDATE usuarios SET reputacion = ? WHERE id = ?', [nuevaReputacion, Number(idUsuario)], conexion);
  return nuevaReputacion;
}

// Inserta una calificación nueva
export async function crear(conexion, datos) {
  const resultado = await consultar(
    `INSERT INTO resenas (subasta_id, autor_id, calificado_id, puntaje, comentario, contexto_rol)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(datos.auctionId),
      Number(datos.reviewerId),
      Number(datos.targetUserId),
      Number(datos.rating),
      datos.comment || '',
      datos.roleContext || 'comprador_a_vendedor',
    ],
    conexion
  );
  return buscarPorId(resultado.insertId, conexion);
}

// Actualiza puntaje, comentario o contexto de una reseña
export async function actualizar(conexion, id, campos) {
  const mapa = { rating: 'puntaje', comment: 'comentario', roleContext: 'contexto_rol' };
  const partes = [];
  const valores = [];

  for (const [clave, columna] of Object.entries(mapa)) {
    if (campos[clave] !== undefined) {
      partes.push(`${columna} = ?`);
      valores.push(campos[clave]);
    }
  }

  if (partes.length > 0) {
    valores.push(Number(id));
    await consultar(`UPDATE resenas SET ${partes.join(', ')} WHERE id = ?`, valores, conexion);
  }
  return buscarPorId(id, conexion);
}

// Elimina una reseña por su ID
export async function eliminar(conexion, id) {
  const resultado = await consultar('DELETE FROM resenas WHERE id = ?', [Number(id)], conexion);
  return resultado.affectedRows > 0;
}
