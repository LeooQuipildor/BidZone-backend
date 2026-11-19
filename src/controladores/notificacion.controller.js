import * as modeloNotificacion from '../modelos/notificacion.model.js';
import * as modeloUsuario from '../modelos/usuario.model.js';
import { ErrorApi, atraparErrores } from '../middlewares/errores.middleware.js';
import { exigirCampos, exigirValorPermitido, leerIdPositivo } from '../middlewares/validar.middleware.js';

const TIPOS_VALIDOS = ['outbid', 'won', 'closed', 'report', 'system'];

// GET /api/notificaciones - Lista notificaciones del usuario logueado (o de otro si es admin)
export const listarNotificaciones = atraparErrores(async (req, res) => {
  let idUsuario = req.usuario.id;

  if (req.query.userId !== undefined) {
    const idSolicitado = leerIdPositivo(req.query.userId);
    if (!idSolicitado) throw new ErrorApi(400, 'userId debe ser un número positivo.');
    if (req.usuario.role !== 'admin' && idSolicitado !== Number(req.usuario.id)) {
      throw new ErrorApi(403, 'No puedes ver notificaciones de otro usuario.');
    }
    idUsuario = idSolicitado;
  }

  const lista = await modeloNotificacion.listarTodas({
    userId: idUsuario,
    onlyUnread: req.query.unread === 'true',
  });
  res.status(200).json(lista);
});

// POST /api/notificaciones - Envía una notificación manual (solo administrador)
export const crearNotificacion = atraparErrores(async (req, res) => {
  exigirCampos(req.body, ['userId', 'title', 'message']);

  const idUsuario = leerIdPositivo(req.body.userId);
  if (!idUsuario) throw new ErrorApi(400, 'userId debe ser un número positivo.');
  if (!(await modeloUsuario.buscarPorId(idUsuario))) throw new ErrorApi(404, 'El usuario destinatario no existe.');

  const tipo = req.body.type ? exigirValorPermitido(req.body.type, TIPOS_VALIDOS, 'type') : 'system';
  const creada = await modeloNotificacion.crear({
    userId: idUsuario,
    auctionId: req.body.auctionId ? leerIdPositivo(req.body.auctionId) : null,
    title: String(req.body.title).trim(),
    message: String(req.body.message).trim(),
    type: tipo,
  });

  res.status(201).json(creada);
});

// PATCH /api/notificaciones/:id/read - Marca una notificación como leída
export const marcarLeida = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloNotificacion.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Notificación no encontrada.');

  if (req.usuario.role !== 'admin' && Number(actual.userId) !== Number(req.usuario.id)) {
    throw new ErrorApi(403, 'No puedes modificar notificaciones de otro usuario.');
  }

  const actualizada = await modeloNotificacion.marcarLeida(id);
  res.status(200).json(actualizada);
});

// PATCH /api/notificaciones/read-all - Marca todas las notificaciones como leídas
export const marcarTodasLeidas = atraparErrores(async (req, res) => {
  let idUsuario = req.usuario.id;

  if (req.body?.userId !== undefined) {
    const idSolicitado = leerIdPositivo(req.body.userId);
    if (!idSolicitado) throw new ErrorApi(400, 'userId debe ser un número positivo.');
    if (req.usuario.role !== 'admin' && idSolicitado !== Number(req.usuario.id)) {
      throw new ErrorApi(403, 'No puedes modificar notificaciones de otro usuario.');
    }
    idUsuario = idSolicitado;
  }

  const cantidad = await modeloNotificacion.marcarTodasLeidas(idUsuario);
  res.status(200).json({ message: 'Notificaciones marcadas como leídas.', updatedCount: cantidad });
});

// DELETE /api/notificaciones/:id - Elimina una notificación
export const eliminarNotificacion = atraparErrores(async (req, res) => {
  const id = leerIdPositivo(req.params.id);
  const actual = await modeloNotificacion.buscarPorId(id);
  if (!actual) throw new ErrorApi(404, 'Notificación no encontrada.');

  if (req.usuario.role !== 'admin' && Number(actual.userId) !== Number(req.usuario.id)) {
    throw new ErrorApi(403, 'No puedes eliminar notificaciones de otro usuario.');
  }

  await modeloNotificacion.eliminar(id);
  res.status(200).json({ message: 'Notificación eliminada correctamente.', id });
});
