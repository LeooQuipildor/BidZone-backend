import { consultar, ejecutarTransaccion } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

const ORDENES_SQL = {
  endingSoon: "s.estado = 'activa' DESC, s.fecha_fin ASC, s.id DESC",
  priceAsc: 's.precio_actual ASC, s.id DESC',
  priceDesc: 's.precio_actual DESC, s.id DESC',
  newest: 's.creado_en DESC, s.id DESC',
};

// Convierte una fila SQL de subasta al formato JSON que usa el frontend
export function formatearSubasta(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    title: fila.titulo,
    description: fila.descripcion,
    category: fila.categoria,
    imageUrl: fila.url_imagen,
    basePrice: Number(fila.precio_base),
    currentPrice: Number(fila.precio_actual),
    minIncrement: Number(fila.incremento_minimo),
    sellerId: Number(fila.vendedor_id),
    winnerId: fila.ganador_id != null ? Number(fila.ganador_id) : null,
    status: fila.estado,
    endTime: aFechaIso(fila.fecha_fin),
    createdAt: aFechaIso(fila.creado_en),
    updatedAt: aFechaIso(fila.actualizado_en),
    bidCount: fila.cantidad_pujas !== undefined ? Number(fila.cantidad_pujas) : undefined,
    sellerName: fila.vendedor_nombre ?? undefined,
    sellerCity: fila.vendedor_ciudad ?? undefined,
    sellerReputation: fila.vendedor_reputacion !== undefined ? Number(fila.vendedor_reputacion) : undefined,
    winnerName: fila.ganador_nombre ?? undefined,
  };
}

// Cierra automáticamente las subastas cuyo tiempo ya venció y notifica al ganador (RN03)
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
          `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'won')`,
          [ganadorId, subasta.id, '¡Subasta ganada! Contacto liberado', `Ganaste "${subasta.titulo}".`],
          conexion
        );
        await consultar(
          `INSERT INTO notificaciones (usuario_id, subasta_id, titulo, mensaje, tipo) VALUES (?, ?, ?, ?, 'closed')`,
          [subasta.vendedor_id, subasta.id, 'Subasta finalizada con ganador', `Tu subasta "${subasta.titulo}" ya tiene ganador.`],
          conexion
        );
      }
    }
    return lista.length;
  });
}

// Lista todas las subastas con filtros opcionales y ordenamiento
export async function listarTodas({ category, status, search, sellerId, sortBy = 'endingSoon' } = {}) {
  const filtros = [];
  const valores = [];

  if (category && category !== 'Todas') {
    filtros.push('s.categoria = ?');
    valores.push(category);
  }
  if (status && status !== 'todas') {
    filtros.push('s.estado = ?');
    valores.push(status);
  }
  if (sellerId) {
    filtros.push('s.vendedor_id = ?');
    valores.push(Number(sellerId));
  }
  if (search && String(search).trim() !== '') {
    const patron = `%${String(search).trim()}%`;
    filtros.push('(s.titulo LIKE ? OR s.descripcion LIKE ? OR s.categoria LIKE ?)');
    valores.push(patron, patron, patron);
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const orden = ORDENES_SQL[sortBy] || ORDENES_SQL.endingSoon;

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

// Busca una subasta por ID trayendo datos completos del vendedor y del ganador
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

// Bloquea la fila de la subasta durante una transacción de puja para evitar choques
export async function buscarParaBloquear(conexion, id) {
  const filas = await consultar('SELECT * FROM subastas WHERE id = ? LIMIT 1 FOR UPDATE', [Number(id)], conexion);
  return filas[0] || null;
}

export async function contarPujas(id) {
  const filas = await consultar('SELECT COUNT(*) AS total FROM pujas WHERE subasta_id = ?', [Number(id)]);
  return Number(filas[0]?.total || 0);
}

// Crea una subasta nueva
export async function crear(datos) {
  const resultado = await consultar(
    `INSERT INTO subastas (titulo, descripcion, categoria, url_imagen, precio_base, precio_actual, incremento_minimo, vendedor_id, ganador_id, estado, fecha_fin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 'activa', ?)`,
    [
      datos.title,
      datos.description || '',
      datos.category || 'Tecnología',
      datos.imageUrl || '',
      Number(datos.basePrice),
      Number(datos.basePrice),
      Number(datos.minIncrement),
      Number(datos.sellerId),
      datos.endTime,
    ]
  );
  return buscarPorId(resultado.insertId);
}

// Actualiza los campos modificados de una subasta
export async function actualizar(id, campos) {
  const mapa = {
    title: 'titulo', description: 'descripcion', category: 'categoria', imageUrl: 'url_imagen',
    basePrice: 'precio_base', currentPrice: 'precio_actual', minIncrement: 'incremento_minimo',
    status: 'estado', endTime: 'fecha_fin',
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

// Elimina una subasta por ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM subastas WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}
