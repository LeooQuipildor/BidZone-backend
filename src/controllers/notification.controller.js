import * as notificationModel from '../models/notification.model.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const NOTIFICATION_TYPES = ['outbid', 'won', 'closed', 'report', 'system'];

export function createNotificationController(deps = {}) {
  const notifications = deps.notificationModel || notificationModel;
  const users = deps.userModel || userModel;

  const listNotifications = asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const onlyUnread = req.query.unread === 'true';

    let targetUserId = req.user.id;
    if (req.query.userId !== undefined) {
      const parsed = parsePositiveId(req.query.userId);
      if (!parsed) {
        throw new AppError(400, 'El parámetro userId debe ser un entero positivo.');
      }
      if (!isAdmin && parsed !== Number(req.user.id)) {
        throw new AppError(403, 'No puedes consultar notificaciones de otro usuario.');
      }
      targetUserId = parsed;
    }

    const list = await notifications.findAll({
      userId: targetUserId,
      onlyUnread,
    });
    res.status(200).json(list);
  });

  const createNotification = asyncHandler(async (req, res) => {
    requireFields(req.body, ['userId', 'title', 'message']);

    const userId = parsePositiveId(req.body.userId);
    if (!userId) {
      throw new AppError(400, 'El campo userId debe ser un entero positivo.');
    }

    const user = await users.findById(userId);
    if (!user) {
      throw new AppError(404, 'El usuario destinatario no existe.');
    }

    const auctionId = req.body.auctionId ? parsePositiveId(req.body.auctionId) : null;
    if (req.body.auctionId && !auctionId) {
      throw new AppError(400, 'El campo auctionId debe ser un entero positivo.');
    }

    const type = req.body.type
      ? assertEnumValue(req.body.type, NOTIFICATION_TYPES, 'type')
      : 'system';

    const created = await notifications.create({
      userId,
      auctionId,
      title: String(req.body.title).trim(),
      message: String(req.body.message).trim(),
      type,
    });

    res.status(201).json(created);
  });

  const markAsRead = asyncHandler(async (req, res) => {
    const notifId = parsePositiveId(req.params.id);
    const existing = await notifications.findById(notifId);
    if (!existing) {
      throw new AppError(404, 'Notificación no encontrada.');
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && Number(existing.userId) !== Number(req.user.id)) {
      throw new AppError(403, 'No puedes modificar notificaciones de otro usuario.');
    }

    const updated = await notifications.markAsRead(notifId);
    res.status(200).json(updated);
  });

  const markAllAsRead = asyncHandler(async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    let targetUserId = req.user.id;

    if (req.body?.userId !== undefined) {
      const parsed = parsePositiveId(req.body.userId);
      if (!parsed) {
        throw new AppError(400, 'El campo userId debe ser un entero positivo.');
      }
      if (!isAdmin && parsed !== Number(req.user.id)) {
        throw new AppError(403, 'No puedes actualizar notificaciones de otro usuario.');
      }
      targetUserId = parsed;
    }

    const updatedCount = await notifications.markAllAsRead(targetUserId);
    res.status(200).json({
      message: 'Notificaciones marcadas como leídas.',
      updatedCount,
    });
  });

  const deleteNotification = asyncHandler(async (req, res) => {
    const notifId = parsePositiveId(req.params.id);
    const existing = await notifications.findById(notifId);
    if (!existing) {
      throw new AppError(404, 'Notificación no encontrada.');
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin && Number(existing.userId) !== Number(req.user.id)) {
      throw new AppError(403, 'No puedes eliminar notificaciones de otro usuario.');
    }

    await notifications.remove(notifId);
    res.status(200).json({
      message: 'Notificación eliminada correctamente.',
      id: notifId,
    });
  });

  return {
    listNotifications,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}

export const {
  listNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = createNotificationController();

