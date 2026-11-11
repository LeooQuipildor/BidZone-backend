import { query, withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as reportModel from '../models/report.model.js';
import * as userModel from '../models/user.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const REPORT_STATUSES = ['en_revision', 'resuelto_sancion', 'desestimado'];
const ACCOUNT_ACTIONS = ['none', 'suspend', 'close', 'activate'];

export function createReportController(deps = {}) {
  const reports = deps.reportModel || reportModel;
  const auctions = deps.auctionModel || auctionModel;
  const users = deps.userModel || userModel;
  const runTx = deps.withTransaction || withTransaction;
  const runQuery = deps.query || query;

  const listReports = asyncHandler(async (req, res) => {
    const { status, auctionId } = req.query;
    if (status && status !== 'todos') {
      assertEnumValue(status, REPORT_STATUSES, 'status');
    }

    const parsedAuctionId = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !parsedAuctionId) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const list = await reports.findAll({
      status,
      auctionId: parsedAuctionId,
      participantUserId: req.user.role === 'admin' ? undefined : req.user.id,
    });

    res.status(200).json(list);
  });

  const getReportById = asyncHandler(async (req, res) => {
    const reportId = parsePositiveId(req.params.id);
    const report = await reports.findById(reportId);
    if (!report) {
      throw new AppError(404, 'Reporte no encontrado.');
    }

    const isAdmin = req.user.role === 'admin';
    const isInvolved =
      Number(report.reporterId) === Number(req.user.id) ||
      Number(report.reportedUserId) === Number(req.user.id);

    if (!isAdmin && !isInvolved) {
      throw new AppError(403, 'No tienes permisos para ver este expediente de reporte.');
    }

    res.status(200).json(report);
  });

  const createReport = asyncHandler(async (req, res) => {
    requireFields(req.body, ['auctionId', 'reportedUserId', 'reason', 'description']);

    const auctionId = parsePositiveId(req.body.auctionId);
    const reportedUserId = parsePositiveId(req.body.reportedUserId);
    if (!auctionId || !reportedUserId) {
      throw new AppError(400, 'auctionId y reportedUserId deben ser enteros positivos válidos.');
    }

    if (Number(reportedUserId) === Number(req.user.id)) {
      throw new AppError(400, 'No puedes generar un reporte en tu propia contra.');
    }

    const reason = String(req.body.reason).trim();
    const description = String(req.body.description).trim();
    const evidenceUrl = req.body.evidenceUrl ? String(req.body.evidenceUrl).trim() : '';

    const auction = await auctions.findById(auctionId);
    if (!auction) {
      throw new AppError(404, 'La subasta referenciada no existe.');
    }

    const reportedUser = await users.findById(reportedUserId);
    if (!reportedUser) {
      throw new AppError(404, 'El usuario denunciado no existe.');
    }

    const created = await runTx(async (conn) => {
      const report = await reports.create(conn, {
        auctionId,
        reporterId: req.user.id,
        reportedUserId,
        reason,
        description,
        evidenceUrl,
        status: 'en_revision',
        sanctionApplied: 'Pendiente de evaluación',
      });

      await runQuery(
        `INSERT INTO notifications (user_id, auction_id, title, message, type)
         VALUES (?, ?, ?, ?, 'report')`,
        [
          reportedUserId,
          auctionId,
          'Nuevo reporte de incumplimiento registrado',
          `Se ha abierto un expediente de mediación (#${report.id}) por "${reason}".`,
        ],
        conn
      );

      return report;
    });

    res.status(201).json(created);
  });

  const updateReport = asyncHandler(async (req, res) => {
    const reportId = parsePositiveId(req.params.id);

    if (req.body.status !== undefined) {
      assertEnumValue(req.body.status, REPORT_STATUSES, 'status');
    }
    if (req.body.accountAction !== undefined) {
      assertEnumValue(req.body.accountAction, ACCOUNT_ACTIONS, 'accountAction');
    }

    const updated = await runTx(async (conn) => {
      const existing = await reports.findById(reportId, conn);
      if (!existing) {
        throw new AppError(404, 'Reporte no encontrado.');
      }

      const isAdmin = req.user.role === 'admin';
      const isReporter = Number(existing.reporterId) === Number(req.user.id);

      if (!isAdmin && !isReporter) {
        throw new AppError(403, 'No tienes permisos para modificar este reporte.');
      }

      if (!isAdmin) {
        if (
          (req.body.status !== undefined && req.body.status !== existing.status) ||
          (req.body.sanctionApplied !== undefined &&
            String(req.body.sanctionApplied).trim() !== existing.sanctionApplied) ||
          (req.body.accountAction !== undefined && req.body.accountAction !== 'none')
        ) {
          throw new AppError(
            403,
            'RN06: Solo un administrador puede resolver el expediente o aplicar sanciones disciplinarias.'
          );
        }
        if (existing.status !== 'en_revision') {
          throw new AppError(
            409,
            'Este expediente ya fue resuelto y no puede ser modificado.'
          );
        }
      }

      const updates = {};
      if (req.body.reason !== undefined) {
        const cleanReason = String(req.body.reason).trim();
        if (!cleanReason) {
          throw new AppError(400, 'El motivo del reporte no puede quedar vacío.');
        }
        updates.reason = cleanReason;
      }
      if (req.body.description !== undefined) {
        const cleanDesc = String(req.body.description).trim();
        if (!cleanDesc) {
          throw new AppError(400, 'La descripción del reporte no puede quedar vacía.');
        }
        updates.description = cleanDesc;
      }
      if (req.body.evidenceUrl !== undefined) {
        updates.evidenceUrl = String(req.body.evidenceUrl).trim();
      }
      if (isAdmin && req.body.status !== undefined) {
        updates.status = req.body.status;
      }
      if (isAdmin && req.body.sanctionApplied !== undefined) {
        updates.sanctionApplied = String(req.body.sanctionApplied).trim();
      }

      const saved = await reports.update(conn, reportId, updates);

      // RN06: Aplicar sanción disciplinaria sobre el usuario reportado (solo Admin)
      const action = isAdmin ? req.body.accountAction : 'none';
      if (
        isAdmin &&
        (saved.status === 'resuelto_sancion' ||
          action === 'suspend' ||
          action === 'close')
      ) {
        const nextUserStatus = action === 'close' ? 'closed' : 'suspended';
        await runQuery(
          'UPDATE users SET status = ? WHERE id = ?',
          [nextUserStatus, saved.reportedUserId],
          conn
        );
        await runQuery(
          `INSERT INTO notifications (user_id, auction_id, title, message, type)
           VALUES (?, ?, ?, ?, 'report')`,
          [
            saved.reportedUserId,
            saved.auctionId,
            'Resolución de expediente disciplinario',
            `Tu cuenta cambió al estado "${nextUserStatus}" tras el expediente #${saved.id}: ${saved.sanctionApplied}.`,
          ],
          conn
        );
      } else if (isAdmin && action === 'activate') {
        await runQuery(
          'UPDATE users SET status = ? WHERE id = ?',
          ['active', saved.reportedUserId],
          conn
        );
      }

      return saved;
    });

    res.status(200).json(updated);
  });

  const deleteReport = asyncHandler(async (req, res) => {
    const reportId = parsePositiveId(req.params.id);
    const existing = await reports.findById(reportId);
    if (!existing) {
      throw new AppError(404, 'Reporte no encontrado.');
    }

    await reports.remove(reportId);
    res.status(200).json({
      message: 'Reporte eliminado correctamente.',
      id: reportId,
    });
  });

  return {
    listReports,
    getReportById,
    createReport,
    updateReport,
    deleteReport,
  };
}

export const {
  listReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} = createReportController();

