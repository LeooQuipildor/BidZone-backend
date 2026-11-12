import * as notificationModel from '../models/notification.model.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const TIPOS_NOTIFICACION = ['outbid', 'won', 'closed', 'report', 'system'];

// Controlador de Avisos y Notificaciones del Usuario
export function createNotificationController(deps = {}) {
  const notifications = deps.notificationModel || notificationModel;
  const users = deps.userModel || userModel;

  // GET /api/notificaciones - Listar bandeja de notificaciones
  const listNotifications = asyncHandler(async (peticion, respuesta) => {
    const esAdmin = peticion.user.role === 'admin';
    let idUsuarioObjetivo = peticion.user.id;

    if (peticion.query.userId !== undefined) {
      const idNumerico = parsePositiveId(peticion.query.userId);
      if (!idNumerico) throw new AppError(400, 'El parámetro userId debe ser un entero positivo.');
      if (!esAdmin && idNumerico !== Number(peticion.user.id)) {
        throw new AppError(403, 'No puedes consultar notificaciones de otro usuario.');
      }
      idUsuarioObjetivo = idNumerico;
    }

    const listado = await notifications.findAll({
      userId: idUsuarioObjetivo,
      onlyUnread: peticion.query.unread === 'true',
    });
    respuesta.status(200).json(listado);
  });

  // POST /api/notificaciones - Enviar notificación oficial (Solo Administrador)
  const createNotification = asyncHandler(async (peticion, respuesta) => {
    requireFields(peticion.body, ['userId', 'title', 'message']);

    const idUsuario = parsePositiveId(peticion.body.userId);
    if (!idUsuario) throw new AppError(400, 'El campo userId debe ser un entero positivo.');

    const usuario = await users.findById(idUsuario);
    if (!usuario) throw new AppError(404, 'El usuario destinatario no existe.');

    const idSubasta = peticion.body.auctionId ? parsePositiveId(peticion.body.auctionId) : null;
    const tipo = peticion.body.type ? assertEnumValue(peticion.body.type, TIPOS_NOTIFICACION, 'type') : 'system';

    const notificacionCreada = await notifications.create({
      userId: idUsuario,
      auctionId: idSubasta,
      title: String(peticion.body.title).trim(),
      message: String(peticion.body.message).trim(),
      type: tipo,
    });

    respuesta.status(201).json(notificacionCreada);
  });

  // PATCH /api/notificaciones/:id/read - Marcar aviso como leído
  const markAsRead = asyncHandler(async (peticion, respuesta) => {
    const idNotificacion = parsePositiveId(peticion.params.id);
    const notificacionExistente = await notifications.findById(idNotificacion);
    if (!notificacionExistente) throw new AppError(404, 'Notificación no encontrada.');

    const esAdmin = peticion.user.role === 'admin';
    if (!esAdmin && Number(notificacionExistente.userId) !== Number(peticion.user.id)) {
      throw new AppError(403, 'No puedes modificar notificaciones de otro usuario.');
    }

    const notificacionActualizada = await notifications.markAsRead(idNotificacion);
    respuesta.status(200).json(notificacionActualizada);
  });

  // PATCH /api/notificaciones/read-all - Marcar todas las notificaciones como leídas
  const markAllAsRead = asyncHandler(async (peticion, respuesta) => {
    const esAdmin = peticion.user.role === 'admin';
    let idUsuarioObjetivo = peticion.user.id;

    if (peticion.body?.userId !== undefined) {
      const idNumerico = parsePositiveId(peticion.body.userId);
      if (!idNumerico) throw new AppError(400, 'El campo userId debe ser un entero positivo.');
      if (!esAdmin && idNumerico !== Number(peticion.user.id)) {
        throw new AppError(403, 'No puedes actualizar notificaciones de otro usuario.');
      }
      idUsuarioObjetivo = idNumerico;
    }

    const cantidadActualizada = await notifications.markAllAsRead(idUsuarioObjetivo);
    respuesta.status(200).json({ message: 'Notificaciones marcadas como leídas.', updatedCount: cantidadActualizada });
  });

  // DELETE /api/notificaciones/:id - Eliminar notificación
  const deleteNotification = asyncHandler(async (peticion, respuesta) => {
    const idNotificacion = parsePositiveId(peticion.params.id);
    const notificacionExistente = await notifications.findById(idNotificacion);
    if (!notificacionExistente) throw new AppError(404, 'Notificación no encontrada.');

    const esAdmin = peticion.user.role === 'admin';
    if (!esAdmin && Number(notificacionExistente.userId) !== Number(peticion.user.id)) {
      throw new AppError(403, 'No puedes eliminar notificaciones de otro usuario.');
    }

    await notifications.remove(idNotificacion);
    respuesta.status(200).json({ message: 'Notificación eliminada correctamente.', id: idNotificacion });
  });

  return { listNotifications, createNotification, markAsRead, markAllAsRead, deleteNotification };
}

export const {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = createNotificationController();
