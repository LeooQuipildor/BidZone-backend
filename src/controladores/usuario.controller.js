/**
 * ============================================================================
 * ARCHIVO: src/controladores/usuario.controller.js
 * ROL: Controlador CRUD de usuarios + privacidad de contacto (RN05) + control de rol (RN06).
 * ============================================================================
 *
 * REGLAS QUE PROTEGE ESTE ARCHIVO:
 * - RN05: Ningún usuario común puede ver el correo o teléfono de un desconocido.
 *   Solo se muestran si es admin, si es su propio perfil o si compartieron una subasta finalizada.
 * - RN06: Solo un administrador puede cambiar el rol, estado ('activa'/'suspendida'/'cerrada')
 *   o la reputación de una cuenta.
 */

import bcrypt from 'bcryptjs';
import { entorno } from '../config/entorno.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import {
  esCorreoValido,
  exigirCampos,
  exigirValorPermitido,
  leerIdPositivo,
} from '../middlewares/validar.middleware.js';

const ROLES_VALIDOS = ['usuario', 'admin'];
const ESTADOS_VALIDOS = ['activa', 'suspendida', 'cerrada'];

// Función auxiliar RN05: devuelve el usuario intacto si hay permiso, o con correo/teléfono en null
function ocultarContactoSiCorresponde(usuario, solicitante, idsLiberados) {
  const esAdmin = solicitante?.rol === 'admin';
  const esPropio = Number(solicitante?.id) === Number(usuario.id);
  const estaLiberado = idsLiberados?.has(Number(usuario.id));

  if (esAdmin || esPropio || estaLiberado) return usuario;
  return { ...usuario, correo: null, telefono: null, contactoBloqueado: true };
}

// GET /api/usuarios -> Lista usuarios aplicando filtros de req.query (?rol=...&estado=...&busqueda=...)
export const listarUsuarios = atraparErrores(async (req, res) => {
  const { rol, estado, busqueda } = req.query;
  if (rol) exigirValorPermitido(rol, ROLES_VALIDOS, 'rol');
  if (estado) exigirValorPermitido(estado, ESTADOS_VALIDOS, 'estado');

  const usuarios = await modeloUsuario.listarTodos({ rol, estado, busqueda });
  const idsLiberados =
    req.usuario.rol === 'admin'
      ? null
      : await modeloUsuario.obtenerSociosConContactoLiberado(req.usuario.id);

  const resultado = usuarios.map((u) => ocultarContactoSiCorresponde(u, req.usuario, idsLiberados));
  res.status(200).json(resultado);
});

// GET /api/usuarios/:id -> Devuelve un usuario individual respetando privacidad RN05
export const obtenerUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const usuario = await modeloUsuario.buscarPorId(id);
  if (!usuario) throw new ErrorApi(404, 'Usuario no encontrado.');

  const idsLiberados =
    req.usuario.rol === 'admin'
      ? null
      : await modeloUsuario.obtenerSociosConContactoLiberado(req.usuario.id);

  res.status(200).json(ocultarContactoSiCorresponde(usuario, req.usuario, idsLiberados));
});

// POST /api/usuarios -> Alta de usuario desde el Panel de Administración (ruta protegida con exigirRol('admin'))
export const crearUsuario = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['nombre', 'correo', 'contrasena']);

  const nombre = String(req.body.nombre).trim();
  const correo = String(req.body.correo).trim().toLowerCase();
  const contrasena = String(req.body.contrasena);
  const rol = req.body.rol || 'usuario';
  const estado = req.body.estado || 'activa';

  if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
  if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
  if (contrasena.length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');
  exigirValorPermitido(rol, ROLES_VALIDOS, 'rol');
  exigirValorPermitido(estado, ESTADOS_VALIDOS, 'estado');

  if (await modeloUsuario.existeCorreo(correo)) {
    throw new ErrorApi(409, 'Ya existe un usuario con ese correo.');
  }

  const usuarioCreado = await modeloUsuario.crear({
    nombre,
    correo,
    contrasenaHash: await bcrypt.hash(contrasena, entorno.rondasBcrypt),
    rol,
    estado,
    telefono: req.body.telefono ? String(req.body.telefono).trim() : '',
    ciudad: req.body.ciudad ? String(req.body.ciudad).trim() : '',
    reputacion: req.body.reputacion ?? 5.0,
  });

  res.status(201).json(usuarioCreado);
});

// PUT /api/usuarios/:id -> Permite editar el propio perfil o, si es admin, cualquier cuenta y su estado
export const actualizarUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloUsuario.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Usuario no encontrado.');

  const esAdmin = req.usuario.rol === 'admin';
  const esPropio = Number(req.usuario.id) === Number(id);
  if (!esAdmin && !esPropio) throw new ErrorApi(403, 'No tienes permisos para modificar otro usuario.');

  // RN06: Si un socio común intenta enviarse rol='admin' o cambiarse su estado, lo rechazamos con 403
  const intentaCambiarAdmin =
    (req.body.rol !== undefined && req.body.rol !== actual.rol) ||
    (req.body.estado !== undefined && req.body.estado !== actual.estado) ||
    (req.body.reputacion !== undefined && Number(req.body.reputacion) !== Number(actual.reputacion));

  if (!esAdmin && intentaCambiarAdmin) {
    throw new ErrorApi(403, 'RN06: Solo un administrador puede cambiar el rol, estado o reputación.');
  }

  // Solo copiamos al objeto "cambios" los campos que realmente envió el cliente
  const cambios = {};
  if (req.body.nombre !== undefined) {
    const nombre = String(req.body.nombre).trim();
    if (nombre.length < 2) throw new ErrorApi(400, 'El nombre debe tener al menos 2 caracteres.');
    cambios.nombre = nombre;
  }
  if (req.body.correo !== undefined) {
    const correo = String(req.body.correo).trim().toLowerCase();
    if (!esCorreoValido(correo)) throw new ErrorApi(400, 'El correo electrónico no es válido.');
    if (await modeloUsuario.existeCorreo(correo, id)) throw new ErrorApi(409, 'Correo ya usado por otro usuario.');
    cambios.correo = correo;
  }
  if (req.body.telefono !== undefined) cambios.telefono = String(req.body.telefono).trim();
  if (req.body.ciudad !== undefined) cambios.ciudad = String(req.body.ciudad).trim();
  if (esAdmin && req.body.rol !== undefined) cambios.rol = exigirValorPermitido(req.body.rol, ROLES_VALIDOS, 'rol');
  if (esAdmin && req.body.estado !== undefined) cambios.estado = exigirValorPermitido(req.body.estado, ESTADOS_VALIDOS, 'estado');
  if (esAdmin && req.body.reputacion !== undefined) cambios.reputacion = Number(req.body.reputacion);
  if (req.body.contrasena) {
    if (String(req.body.contrasena).length < 6) throw new ErrorApi(400, 'La contraseña debe tener al menos 6 caracteres.');
    cambios.contrasenaHash = await bcrypt.hash(String(req.body.contrasena), entorno.rondasBcrypt);
  }

  const actualizado = await modeloUsuario.actualizar(id, cambios);
  res.status(200).json(actualizado);
});

// DELETE /api/usuarios/:id -> Elimina una cuenta (el admin no puede eliminarse a sí mismo)
export const eliminarUsuario = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  if (Number(req.usuario.id) === Number(id)) {
    throw new ErrorApi(400, 'No puedes eliminar tu propia cuenta activa.');
  }

  const existe = await modeloUsuario.buscarPorId(id);
  if (!existe) throw new ErrorApi(404, 'Usuario no encontrado.');

  await modeloUsuario.eliminar(id);
  res.status(200).json({ mensaje: 'Usuario eliminado correctamente.', id });
});
