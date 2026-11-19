/**
 * ============================================================================
 * ARCHIVO: src/modelos/resena.model.js
 * ROL: Consultas SQL de la tabla "resenas" y recálculo de reputación (RN07).
 * ============================================================================
 *
 * Cada vez que se crea, edita o elimina una reseña, el controlador llama a
 * "recalcularReputacion()" para promediar las estrellas con AVG(puntaje) en SQL
 * y actualizar la columna "reputacion" de la tabla "usuarios".
 */

import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de reseña en un objeto JSON en español
export function formatearResena(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    subastaId: Number(fila.subasta_id),
    autorId: Number(fila.autor_id),
    calificadoId: Number(fila.calificado_id),
    puntaje: Number(fila.puntaje),
    comentario: fila.comentario,
    contextoRol: fila.contexto_rol,
    creadoEn: aFechaIso(fila.creado_en),
    actualizadoEn: aFechaIso(fila.actualizado_en),
    tituloSubasta: fila.subasta_titulo ?? undefined,
    nombreAutor: fila.autor_nombre ?? undefined,
    nombreCalificado: fila.calificado_nombre ?? undefined,
  };
}

// Lista reseñas con filtros opcionales de subasta, usuario calificado o autor
export async function listarTodas({ subastaId, calificadoId, autorId } = {}) {
  const filtros = [];
  const valores = [];

  if (subastaId) {
    filtros.push('rs.subasta_id = ?');
    valores.push(Number(subastaId));
  }
  if (calificadoId) {
    filtros.push('rs.calificado_id = ?');
    valores.push(Number(calificadoId));
  }
  if (autorId) {
    filtros.push('rs.autor_id = ?');
    valores.push(Number(autorId));
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

// Busca una calificación por ID
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

// RN07: Verifica si este autor ya calificó esa subasta para impedir calificaciones duplicadas
export async function yaCalifico(conexion, subastaId, autorId) {
  const filas = await consultar(
    'SELECT id FROM resenas WHERE subasta_id = ? AND autor_id = ? LIMIT 1',
    [Number(subastaId), Number(autorId)],
    conexion
  );
  return filas.length > 0;
}

// Calcula el promedio redondeado a 2 decimales (si el usuario no tiene reseñas vuelve a 5.0)
export async function recalcularReputacion(conexion, usuarioId) {
  const filas = await consultar(
    'SELECT ROUND(AVG(puntaje), 2) AS promedio, COUNT(*) AS total FROM resenas WHERE calificado_id = ?',
    [Number(usuarioId)],
    conexion
  );
  const nuevaReputacion = Number(filas[0]?.total) > 0 ? Number(filas[0].promedio) : 5.0;
  await consultar('UPDATE usuarios SET reputacion = ? WHERE id = ?', [nuevaReputacion, Number(usuarioId)], conexion);
  return nuevaReputacion;
}

// Inserta una calificación nueva
export async function crear(conexion, datos) {
  const resultado = await consultar(
    `INSERT INTO resenas (subasta_id, autor_id, calificado_id, puntaje, comentario, contexto_rol)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      Number(datos.subastaId),
      Number(datos.autorId),
      Number(datos.calificadoId),
      Number(datos.puntaje),
      datos.comentario || '',
      datos.contextoRol || 'comprador_a_vendedor',
    ],
    conexion
  );
  return buscarPorId(resultado.insertId, conexion);
}

// Actualiza puntaje, comentario o contexto de una reseña existente
export async function actualizar(conexion, id, campos) {
  const mapa = { puntaje: 'puntaje', comentario: 'comentario', contextoRol: 'contexto_rol' };
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

// Elimina una reseña por ID
export async function eliminar(conexion, id) {
  const resultado = await consultar('DELETE FROM resenas WHERE id = ?', [Number(id)], conexion);
  return resultado.affectedRows > 0;
}
