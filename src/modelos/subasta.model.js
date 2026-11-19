/**
 * ============================================================================
 * ARCHIVO: src/modelos/subasta.model.js
 * ROL: Consultas SQL de la tabla "subastas" y cierre automático de lotes vencidos.
 * ============================================================================
 *
 * PUNTOS CLAVE PARA ESTUDIAR:
 * - "cerrarSubastasVencidas()": Implementa RN03. Busca subastas 'activa' cuyo reloj
 *   ya pasó (fecha_fin <= UTC_TIMESTAMP()), las bloquea con "FOR UPDATE" dentro de
 *   una transacción, asigna al postor con la oferta más alta y genera notificaciones.
 * - "INNER JOIN" / "LEFT JOIN": Une la tabla "subastas" con "usuarios" para traer el
 *   nombre del vendedor y del ganador en una sola consulta rápida.
 */

import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

// Diccionario seguro de cláusulas ORDER BY (nunca concatenamos texto libre del usuario al ORDER BY)
const ORDENES_SQL = {
  proximasACerrar: "s.estado = 'activa' DESC, s.fecha_fin ASC, s.id DESC",
  precioAsc: 's.precio_actual ASC, s.id DESC',
  precioDesc: 's.precio_actual DESC, s.id DESC',
  masRecientes: 's.creado_en DESC, s.id DESC',
};

// Traduce una fila SQL de la tabla "subastas" al objeto JSON en español
export function formatearSubasta(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    categoria: fila.categoria,
    urlImagen: fila.url_imagen,
    precioBase: Number(fila.precio_base),
    precioActual: Number(fila.precio_actual),
    incrementoMinimo: Number(fila.incremento_minimo),
    vendedorId: Number(fila.vendedor_id),
    ganadorId: fila.ganador_id != null ? Number(fila.ganador_id) : null,
    estado: fila.estado,
    fechaFin: aFechaIso(fila.fecha_fin),
    creadoEn: aFechaIso(fila.creado_en),
    actualizadoEn: aFechaIso(fila.actualizado_en),
    cantidadPujas: fila.cantidad_pujas !== undefined ? Number(fila.cantidad_pujas) : undefined,
    nombreVendedor: fila.vendedor_nombre ?? undefined,
    ciudadVendedor: fila.vendedor_ciudad ?? undefined,
    reputacionVendedor: fila.vendedor_reputacion !== undefined ? Number(fila.vendedor_reputacion) : undefined,
    nombreGanador: fila.ganador_nombre ?? undefined,
  };
}

/**
 * RN03: Cierra automáticamente las subastas cuyo plazo venció.
 * 1. Primero hace una consulta liviana para ver si hay al menos una vencida (si no, termina rápido).
 * 2. Si hay vencidas, abre una transacción y bloquea esas filas con "FOR UPDATE".
 * 3. Para cada subasta vencida busca la puja más alta, marca estado = 'finalizada',
 *    guarda ganador_id y crea notificaciones para ganador y vendedor.
 */
export async function cerrarSubastasVencidas() {
  const vencidas = await consultar(
    `SELECT id FROM subastas WHERE estado = 'activa' AND fecha_fin <= UTC_TIMESTAMP() LIMIT 1`
  );
  if (vencidas.length === 0) return 0;

  return ejecutarTransaccion(async (conexion) => {
    const lista = await consultar(
      `SELECT id, titulo, vendedor_id FROM subastas WHERE estado = 'activa' AND fecha_fin <= UTC_TIMESTAMP() FOR UPDATE`,
      [],
      conexion
    );

    for (const subasta of lista) {
      // Ordena por monto DESC y en empate gana la primera puja registrada (id ASC)
      const mejores = await consultar(
        `SELECT postor_id FROM pujas WHERE subasta_id = ? ORDER BY monto DESC, id ASC LIMIT 1`,
        [subasta.id],
        conexion
      );
      const ganadorId = mejores[0]?.postor_id || null;

      await consultar(
        `UPDATE subastas SET estado = 'finalizada', ganador_id = ? WHERE id = ?`,
        [ganadorId, subasta.id],
        conexion
      );

      if (ganadorId) {
        await consultar(
          `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'ganada')`,
          [ganadorId, subasta.id, '¡Subasta ganada! Contacto liberado', `Ganaste "${subasta.titulo}".`],
          conexion
        );
        await consultar(
          `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'cerrada')`,
          [subasta.vendedor_id, subasta.id, 'Subasta finalizada con ganador', `Tu subasta "${subasta.titulo}" ya tiene ganador.`],
          conexion
        );
      }
    }
    return lista.length;
  });
}

// Lista subastas aplicando filtros opcionales y contando las pujas de cada lote con COALESCE(..., 0)
export async function listarTodas({ categoria, estado, busqueda, vendedorId, ordenarPor = 'proximasACerrar' } = {}) {
  const filtros = [];
  const valores = [];

  if (categoria && categoria !== 'Todas') {
    filtros.push('s.categoria = ?');
    valores.push(categoria);
  }
  if (estado && estado !== 'todas') {
    filtros.push('s.estado = ?');
    valores.push(estado);
  }
  if (vendedorId) {
    filtros.push('s.vendedor_id = ?');
    valores.push(Number(vendedorId));
  }
  if (busqueda && String(busqueda).trim() !== '') {
    const patron = `%${String(busqueda).trim()}%`;
    filtros.push('(s.titulo LIKE ? OR s.descripcion LIKE ? OR s.categoria LIKE ?)');
    valores.push(patron, patron, patron);
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const orden = ORDENES_SQL[ordenarPor] || ORDENES_SQL.proximasACerrar;

  const filas = await consultar(
    `SELECT s.*, v.nombre AS vendedor_nombre, v.ciudad AS vendedor_ciudad, v.reputacion AS vendedor_reputacion,
       g.nombre AS ganador_nombre, COALESCE(cp.cantidad_pujas, 0) AS cantidad_pujas
     FROM subastas s
     INNER JOIN usuarios v ON v.id = s.vendedor_id
     LEFT JOIN usuarios g ON g.id = s.ganador_id
     LEFT JOIN (SELECT subasta_id, COUNT(*) AS cantidad_pujas FROM pujas GROUP BY subasta_id) cp ON cp.subasta_id = s.id
     ${where}
     ORDER BY ${orden}`,
    valores
  );
  return filas.map(formatearSubasta);
}

// Trae la fila completa con correo y teléfono de vendedor/ganador para que el controlador decida si liberarlos (RN05)
export async function buscarDetalleCrudo(id, conexion) {
  const filas = await consultar(
    `SELECT s.*, v.nombre AS vendedor_nombre, v.correo AS vendedor_correo, v.telefono AS vendedor_telefono,
       v.ciudad AS vendedor_ciudad, v.reputacion AS vendedor_reputacion,
       g.nombre AS ganador_nombre, g.correo AS ganador_correo, g.telefono AS ganador_telefono,
       g.ciudad AS ganador_ciudad, g.reputacion AS ganador_reputacion,
       (SELECT COUNT(*) FROM pujas p WHERE p.subasta_id = s.id) AS cantidad_pujas
     FROM subastas s
     INNER JOIN usuarios v ON v.id = s.vendedor_id
     LEFT JOIN usuarios g ON g.id = s.ganador_id
     WHERE s.id = ? LIMIT 1`,
    [Number(id)],
    conexion
  );
  return filas[0] || null;
}

export async function buscarPorId(id, conexion) {
  const fila = await buscarDetalleCrudo(id, conexion);
  return formatearSubasta(fila);
}

// "FOR UPDATE" bloquea temporalmente esta fila mientras se procesa una puja para que 2 pujas simultáneas no se pisen
export async function buscarParaBloquear(conexion, id) {
  const filas = await consultar('SELECT * FROM subastas WHERE id = ? LIMIT 1 FOR UPDATE', [Number(id)], conexion);
  return filas[0] || null;
}

// Cuenta cuántas ofertas recibió una subasta (se usa para aplicar el bloqueo de edición RN08)
export async function contarPujas(id) {
  const filas = await consultar('SELECT COUNT(*) AS total FROM pujas WHERE subasta_id = ?', [Number(id)]);
  return Number(filas[0]?.total || 0);
}

// Inserta una nueva subasta (al crearse, precio_actual arranca igual a precio_base y estado = 'activa')
export async function crear(datos) {
  const resultado = await consultar(
    `INSERT INTO subastas (titulo, descripcion, categoria, url_imagen, precio_base, precio_actual, incremento_minimo, vendedor_id, ganador_id, estado, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'activa', ?)`,
    [
      datos.titulo,
      datos.descripcion || '',
      datos.categoria || 'Tecnología',
      datos.urlImagen || '',
      Number(datos.precioBase),
      Number(datos.precioBase),
      Number(datos.incrementoMinimo),
      Number(datos.vendedorId),
      datos.fechaFin,
    ]
  );
  return buscarPorId(resultado.insertId);
}

// Actualiza solo los campos modificados de una subasta
export async function actualizar(id, campos) {
  const mapa = {
    titulo: 'titulo',
    descripcion: 'descripcion',
    categoria: 'categoria',
    urlImagen: 'url_imagen',
    precioBase: 'precio_base',
    precioActual: 'precio_actual',
    incrementoMinimo: 'incremento_minimo',
    estado: 'estado',
    fechaFin: 'fecha_fin',
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
    await consultar(`UPDATE subastas SET ${partes.join(', ')} WHERE id = ?`, valores);
  }
  return buscarPorId(id);
}

// Borra una subasta por ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM subastas WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}
