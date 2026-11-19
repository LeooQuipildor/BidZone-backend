/**
 * ============================================================================
 * ARCHIVO: src/controladores/notificacion.controller.js
 * ROL: Controlador de la bandeja personal de avisos del usuario.
 * ============================================================================
 *
 * PRIVACIDAD:
 * Un socio común solo puede consultar, marcar como leídas y borrar SUS PROPIAS
 * notificaciones (req.usuario.id). Solo un administrador puede enviar avisos
 * manuales a otros usuarios (POST /api/notificaciones).
 */

import * as modeloNotificacion from '../modelos/notificacion.model.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const TIPOS_VALIDOS = ['superada', 'ganada', 'cerrada', 'reporte', 'sistema'];

// GET /api/notificaciones -> Devuelve las notificaciones del usuario logueado (?sinLeer=true filtra pendientes)
export const listarNotificaciones = atraparErrores(async (req, res) => {
  let usuarioId = req.usuario.id;

  if (req.query.usuarioId !== undefined) {
    const idSolicitado = leerIdPositivo(req.query.usuarioId);
    if (!idSolicitado) throw new ErrorApi(400, 'usuarioId debe ser un número positivo.');
    if (req.usuario.rol !== 'admin' && idSolicitado !== Number(req.usuario.id)) {
      throw new ErrorApi(403, 'No puedes ver notificaciones de otro usuario.');
    }
    usuarioId = idSolicitado;
  }

  const lista = await modeloNotificacion.listarTodas({
    usuarioId,
    soloSinLeer: req.query.sinLeer === 'true',
  });
  res.status(200).json(lista);
});

// POST /api/notificaciones -> Permite a un administrador enviar un aviso oficial (ej: solicitud de corrección)
export const crearNotificacion = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['usuarioId', 'titulo', 'mensaje']);

  const usuarioId = leerIdPositivo(req.body.usuarioId);
  if (!usuarioId) throw new ErrorApi(400, 'usuarioId debe ser un número positivo.');
  if (!(await modeloUsuario.buscarPorId(usuarioId))) throw new ErrorApi(404, 'El usuario destinatario no existe.');

  const tipo = req.body.tipo ? exigirValorPermitido(req.body.tipo, TIPOS_VALIDOS, 'tipo') : 'sistema';
  const creada = await modeloNotificacion.crear({
    usuarioId,
    subastaId: req.body.subastaId ? leerIdPositivo(req.body.subastaId) : null,
    titulo: String(req.body.titulo).trim(),
    mensaje: String(req.body.mensaje).trim(),
    tipo,
  });

  res.status(201).json(creada);
});

// PATCH /api/notificaciones/:id/leida -> Marca una notificación individual como leída
export const marcarLeida = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloNotificacion.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Notificación no encontrada.');

  if (req.usuario.rol !== 'admin' && Number(actual.usuarioId) !== Number(req.usuario.id)) {
    throw new ErrorApi(403, 'No puedes modificar notificaciones de otro usuario.');
  }

  const actualizada = await modeloNotificacion.marcarLeida(id);
  res.status(200).json(actualizada);
});

// PATCH /api/notificaciones/leer-todas -> Marca todas las notificaciones del usuario como leídas de una sola vez
export const marcarTodasLeidas = atraparErrores(async (req, res) => {
  let usuarioId = req.usuario.id;

  if (req.body?.usuarioId !== undefined) {
    const idSolicitado = leerIdPositivo(req.body.usuarioId);
    if (!idSolicitado) throw new ErrorApi(400, 'usuarioId debe ser un número positivo.');
    if (req.usuario.rol !== 'admin' && idSolicitado !== Number(req.usuario.id)) {
      throw new ErrorApi(403, 'No puedes modificar notificaciones de otro usuario.');
    }
    usuarioId = idSolicitado;
  }

  const cantidad = await modeloNotificacion.marcarTodasLeidas(usuarioId);
  res.status(200).json({ mensaje: 'Notificaciones marcadas como leídas.', cantidadActualizada: cantidad });
});

// DELETE /api/notificaciones/:id -> Elimina una notificación de la bandeja del usuario
export const eliminarNotificacion = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloNotificacion.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Notificación no encontrada.');

  if (req.usuario.rol !== 'admin' && Number(actual.usuarioId) !== Number(req.usuario.id)) {
    throw new ErrorApi(403, 'No puedes eliminar notificaciones de otro usuario.');
  }

  await modeloNotificacion.eliminar(id);
  res.status(200).json({ mensaje: 'Notificación eliminada correctamente.', id });
});
