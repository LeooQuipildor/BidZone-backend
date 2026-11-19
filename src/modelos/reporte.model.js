import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Convierte una fila SQL de reporte al formato JSON de la API
export function formatearReporte(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    auctionId: Number(fila.subasta_id),
    reporterId: Number(fila.denunciante_id),
    reportedUserId: Number(fila.denunciado_id),
    reason: fila.motivo,
    description: fila.descripcion,
    evidenceUrl: fila.url_evidencia ?? '',
    status: fila.estado,
    sanctionApplied: fila.sancion_aplicada,
    createdAt: aFechaIso(fila.creado_en),
    updatedAt: aFechaIso(fila.actualizado_en),
    auctionTitle: fila.subasta_titulo ?? undefined,
    reporterName: fila.denunciante_nombre ?? undefined,
    reportedUserName: fila.denunciado_nombre ?? undefined,
  };
}

// Lista reportes con filtros opcionales de estado, subasta o usuario participante
export async function listarTodos({ status, auctionId, participantUserId } = {}) {
  const filtros = [];
  const valores = [];

  if (status && status !== 'todos') {
    filtros.push('r.estado = ?');
    valores.push(status);
  }
  if (auctionId) {
    filtros.push('r.subasta_id = ?');
    valores.push(Number(auctionId));
  }
  if (participantUserId) {
    filtros.push('(r.denunciante_id = ? OR r.denunciado_id = ?)');
    valores.push(Number(participantUserId), Number(participantUserId));
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT r.*, s.titulo AS subasta_titulo, u1.nombre AS denunciante_nombre, u2.nombre AS denunciado_nombre
     FROM reportes r
     INNER JOIN subastas s ON s.id = r.subasta_id
     INNER JOIN usuarios u1 ON u1.id = r.denunciante_id
     INNER JOIN usuarios u2 ON u2.id = r.denunciado_id
     ${where}
     ORDER BY r.creado_en DESC, r.id DESC`,
    valores
  );
  return filas.map(formatearReporte);
}

// Busca un reporte por su ID
export async function buscarPorId(id, conexion) {
  const filas = await consultar(
    `SELECT r.*, s.titulo AS subasta_titulo, u1.nombre AS denunciante_nombre, u2.nombre AS denunciado_nombre
     FROM reportes r
     INNER JOIN subastas s ON s.id = r.subasta_id
     INNER JOIN usuarios u1 ON u1.id = r.denunciante_id
     INNER JOIN usuarios u2 ON u2.id = r.denunciado_id
     WHERE r.id = ? LIMIT 1`,
    [Number(id)],
    conexion
  );
  return formatearReporte(filas[0]);
}

// Crea un reporte nuevo en estado 'en_revision'
export async function crear(conexion, datos) {
  const resultado = await consultar(
    `INSERT INTO reportes (subasta_id, denunciante_id, denunciado_id, motivo, descripcion, url_evidencia, estado, sancion_aplicada)
     VALUES (?, ?, ?, ?, ?, ?, 'en_revision', 'Pendiente de evaluación')`,
    [
      Number(datos.auctionId),
      Number(datos.reporterId),
      Number(datos.reportedUserId),
      datos.reason,
      datos.description,
      datos.evidenceUrl || '',
    ],
    conexion
  );
  return buscarPorId(resultado.insertId, conexion);
}

// Actualiza los campos modificados de un reporte
export async function actualizar(conexion, id, campos) {
  const mapa = {
    reason: 'motivo',
    description: 'descripcion',
    evidenceUrl: 'url_evidencia',
    status: 'estado',
    sanctionApplied: 'sancion_aplicada',
  };

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
    await consultar(`UPDATE reportes SET ${partes.join(', ')} WHERE id = ?`, valores, conexion);
  }
  return buscarPorId(id, conexion);
}

// Elimina un reporte por su ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM reportes WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}
