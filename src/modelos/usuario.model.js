import { consultar } from '../config/baseDatos.js';
import { aFechaIso } from '../utilidades/fecha.js';

const COLUMNAS_USUARIO =
  'id, nombre, correo, rol, telefono, ciudad, estado, reputacion, creado_en, actualizado_en';

// Convierte una fila de MySQL al objeto usuario en español (nunca expone la contraseña)
export function formatearUsuario(fila) {
  if (!fila) return null;
  return {
    id: Number(fila.id),
    nombre: fila.nombre,
    correo: fila.correo,
    rol: fila.rol,
    telefono: fila.telefono ?? '',
    ciudad: fila.ciudad ?? '',
    estado: fila.estado,
    reputacion: Number(fila.reputacion ?? 5),
    creadoEn: aFechaIso(fila.creado_en),
    actualizadoEn: aFechaIso(fila.actualizado_en),
  };
}

// Lista usuarios con filtros opcionales de rol, estado o búsqueda
export async function listarTodos({ rol, estado, busqueda } = {}) {
  const filtros = [];
  const valores = [];

  if (rol) {
    filtros.push('rol = ?');
    valores.push(rol);
  }
  if (estado) {
    filtros.push('estado = ?');
    valores.push(estado);
  }
  if (busqueda && String(busqueda).trim() !== '') {
    const patron = `%${String(busqueda).trim()}%`;
    filtros.push('(nombre LIKE ? OR correo LIKE ? OR ciudad LIKE ?)');
    valores.push(patron, patron, patron);
  }

  const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';
  const filas = await consultar(
    `SELECT ${COLUMNAS_USUARIO} FROM usuarios ${where} ORDER BY id DESC`,
    valores
  );
  return filas.map(formatearUsuario);
}

// Busca un usuario por su ID
export async function buscarPorId(id) {
  const filas = await consultar(
    `SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id = ? LIMIT 1`,
    [Number(id)]
  );
  return formatearUsuario(filas[0]);
}

// Busca un usuario por correo incluyendo su contraseña encriptada (solo para login)
export async function buscarParaLogin(correo) {
  const filas = await consultar(
    `SELECT ${COLUMNAS_USUARIO}, contrasena_hash FROM usuarios WHERE LOWER(correo) = LOWER(?) LIMIT 1`,
    [String(correo).trim()]
  );
  if (!filas[0]) return null;
  return { ...formatearUsuario(filas[0]), contrasenaHash: filas[0].contrasena_hash };
}

// Revisa si el correo ya está usado por otra cuenta
export async function existeCorreo(correo, excluirId = null) {
  const valores = [String(correo).trim()];
  let sql = 'SELECT id FROM usuarios WHERE LOWER(correo) = LOWER(?)';
  if (excluirId) {
    sql += ' AND id <> ?';
    valores.push(Number(excluirId));
  }
  const filas = await consultar(`${sql} LIMIT 1`, valores);
  return filas.length > 0;
}

// Inserta un usuario nuevo y devuelve el registro creado
export async function crear(datos) {
  const resultado = await consultar(
    `INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, telefono, ciudad, estado, reputacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      datos.nombre,
      datos.correo.toLowerCase(),
      datos.contrasenaHash,
      datos.rol || 'usuario',
      datos.telefono || '',
      datos.ciudad || '',
      datos.estado || 'activa',
      Number(datos.reputacion ?? 5.0),
    ]
  );
  return buscarPorId(resultado.insertId);
}

// Actualiza solo los campos enviados para un usuario
export async function actualizar(id, campos) {
  const mapa = {
    nombre: 'nombre',
    correo: 'correo',
    contrasenaHash: 'contrasena_hash',
    rol: 'rol',
    telefono: 'telefono',
    ciudad: 'ciudad',
    estado: 'estado',
    reputacion: 'reputacion',
  };

  const partes = [];
  const valores = [];
  for (const [clave, columna] of Object.entries(mapa)) {
    if (campos[clave] !== undefined) {
      partes.push(`${columna} = ?`);
      valores.push(clave === 'correo' ? String(campos[clave]).toLowerCase() : campos[clave]);
    }
  }

  if (partes.length > 0) {
    valores.push(Number(id));
    await consultar(`UPDATE usuarios SET ${partes.join(', ')} WHERE id = ?`, valores);
  }
  return buscarPorId(id);
}

// Elimina un usuario por su ID
export async function eliminar(id) {
  const resultado = await consultar('DELETE FROM usuarios WHERE id = ?', [Number(id)]);
  return resultado.affectedRows > 0;
}

// Devuelve los IDs de usuarios con los que compartió una subasta finalizada (RN05)
export async function obtenerSociosConContactoLiberado(idUsuario) {
  const filas = await consultar(
    `SELECT DISTINCT CASE WHEN vendedor_id = ? THEN ganador_id ELSE vendedor_id END AS socio_id
     FROM subastas
     WHERE estado = 'finalizada' AND ganador_id IS NOT NULL AND (vendedor_id = ? OR ganador_id = ?)`,
    [Number(idUsuario), Number(idUsuario), Number(idUsuario)]
  );
  return new Set(filas.map((fila) => Number(fila.socio_id)));
}
