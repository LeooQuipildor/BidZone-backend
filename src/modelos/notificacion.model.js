/**
 * ============================================================================
 * ARCHIVO: src/modelos/notificacion.model.js
 * ROL: Consultas SQL de la tabla "notificaciones" (avisos personales del usuario).
 * ============================================================================
 *
 * En MySQL no existe tipo booleano real, por eso la columna "leida" es TINYINT(1)
 * (0 = sin leer, 1 = leída). "formatearNotificacion()" la convierte a true/false
 * con Boolean(fila.leida) para que React la use directamente.
 */

import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de notificación en un objeto JSON en español
export function formatearNotificacion(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    usuarioId: Number(fila.usuario_id),
    subastaId: fila.subasta_id != null ? Number(fila.subasta_id) : null,
    titulo: fila.titulo,
    mensaje: fila.mensaje,
    tipo: fila.tipo,
    leida: Boolean(fila.leida),
    creadoEn: aFechaIso(fila.creado_en),
  };
}

// Lista notificaciones de un usuario ordenadas desde la más reciente
export async function listarTodas({ usuarioId, soloSinLeer = false } = {}) {
  const filtros = [];
  const valores = [];

  if (usuarioId) {
    filtros.push('usuario_id = ?');
    valores.push(Number(usuarioId));
  }
  if (soloSinLeer) filtros.push('leida = 0');

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT * FROM notificaciones ${where} ORDER BY creado_en DESC, id DESC`,
    valores
  );
  return filas.map(formatearNotificacion);
}

// Busca una notificación por ID
export async function buscarPorId(id) {
  const filas = await consultar('SELECT * FROM notificaciones WHERE id = ? LIMIT 1', [Number(id)]);
  return formatearNotificacion(filas[0]);
}

// Inserta una notificación nueva en la bandeja del destinatario
export async function crear(datos) {
  const resultado = await consultar(
    `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, ?)`,
    [
      Number(datos.usuarioId),
      datos.subastaId ? Number(datos.subastaId) : null,
      datos.titulo,
      datos.mensaje,
      datos.tipo || 'sistema',
    ]
  );
  return buscarPorId(resultado.insertId);
}

// Marca una notificación individual como leída (leida = 1)
export async function marcarLeida(id) {
  await consultar('UPDATE notificaciones SET leida = 1 WHERE id = ?', [Number(id)]);
  return buscarPorId(id);
}

// Marca en lote todas las notificaciones sin leer del usuario y devuelve cuántas cambió
export async function marcarTodasLeidas(usuarioId) {
  const resultado = await consultar(
    'UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0',
    [Number(usuarioId)]
  );
  return resultado.affectedRows;
}

// Elimina una notificación por ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM notificaciones WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}
