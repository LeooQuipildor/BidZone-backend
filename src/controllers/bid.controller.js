import { query, withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as bidModel from '../models/bid.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertPositiveNumber,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';
import { toIsoUtc } from '../utils/date.js';

export function createBidController(deps = {}) {
  const auctions = deps.auctionModel || auctionModel;
  const bids = deps.bidModel || bidModel;
  const runTx = deps.withTransaction || withTransaction;
  const runQuery = deps.query || query;

  const listBids = asyncHandler(async (req, res) => {
    const { auctionId, bidderId } = req.query;

    const parsedAuctionId = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !parsedAuctionId) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const parsedBidderId = bidderId ? parsePositiveId(bidderId) : undefined;
    if (bidderId && !parsedBidderId) {
      throw new AppError(400, 'El filtro bidderId debe ser un entero positivo.');
    }

    const list = await bids.findAll({
      auctionId: parsedAuctionId,
      bidderId: parsedBidderId,
    });
    res.status(200).json(list);
  });

  const getBidById = asyncHandler(async (req, res) => {
    const bidId = parsePositiveId(req.params.id);
    const bid = await bids.findById(bidId);
    if (!bid) {
      throw new AppError(404, 'Puja no encontrada.');
    }
    res.status(200).json(bid);
  });

  const createBid = asyncHandler(async (req, res) => {
    requireFields(req.body, ['auctionId', 'amount']);

    const auctionId = parsePositiveId(req.body.auctionId);
    if (!auctionId) {
      throw new AppError(400, 'El campo auctionId debe ser un entero positivo.');
    }

    const numericAmount = assertPositiveNumber(req.body.amount, 'amount');

    // RN04: Compromiso vinculante obligatorio
    if (req.body.commitmentAccepted !== true) {
      throw new AppError(
        400,
        'RN04: Debes aceptar el compromiso vinculante de compra para registrar la puja.'
      );
    }

    const note = req.body.note
      ? String(req.body.note).trim()
      : 'Compromiso de pago y retiro acordado.';

    // Sincronizar subastas vencidas antes de abrir transacción de oferta
    await auctions.syncExpiredAuctions();

    const createdBid = await runTx(async (conn) => {
      const auction = await auctions.findByIdForUpdate(conn, auctionId);
      if (!auction) {
        throw new AppError(404, 'La subasta seleccionada no existe.');
      }

      // RN02: Prohibición de auto-puja
      if (Number(auction.seller_id) === Number(req.user.id)) {
        throw new AppError(
          403,
          'RN02: No puedes realizar ofertas sobre una subasta publicada por ti mismo.'
        );
      }

      // RN03: Vigencia temporal y estado activo
      const endMs = new Date(toIsoUtc(auction.end_time)).getTime();
      if (auction.status !== 'activa' || endMs <= Date.now()) {
        throw new AppError(
          409,
          'RN03: La subasta ya no se encuentra activa o su tiempo ha expirado.'
        );
      }

      // RN01: Superar precio actual + incremento mínimo
      const minAllowed =
        Number(auction.current_price) + Number(auction.min_increment);
      if (numericAmount < minAllowed) {
        throw new AppError(
          400,
          `RN01: La oferta debe ser de al menos $${minAllowed.toLocaleString('es-AR')} (Precio actual + incremento mínimo).`
        );
      }

      const previousLeader = await bids.findTopBidByAuction(conn, auctionId);

      const newBid = await bids.create(conn, {
        auctionId,
        bidderId: req.user.id,
        amount: numericAmount,
        note,
        commitmentAccepted: true,
      });

      await runQuery(
        'UPDATE auctions SET current_price = ? WHERE id = ?',
        [numericAmount, auctionId],
        conn
      );

      if (
        previousLeader &&
        Number(previousLeader.bidderId) !== Number(req.user.id)
      ) {
        await runQuery(
          `INSERT INTO notifications (user_id, auction_id, title, message, type)
           VALUES (?, ?, ?, ?, 'outbid')`,
          [
            previousLeader.bidderId,
            auctionId,
            '¡Oferta superada!',
            `Tu oferta en "${auction.title}" fue superada con una puja de $${numericAmount.toLocaleString('es-AR')}.`,
          ],
          conn
        );
      }

      return newBid;
    });

    res.status(201).json(createdBid);
  });

  const updateBid = asyncHandler(async (req, res) => {
    const bidId = parsePositiveId(req.params.id);

    const updated = await runTx(async (conn) => {
      const existing = await bids.findById(bidId, conn);
      if (!existing) {
        throw new AppError(404, 'Puja no encontrada.');
      }

      const isAdmin = req.user.role === 'admin';
      const isOwner = Number(existing.bidderId) === Number(req.user.id);

      if (!isAdmin && !isOwner) {
        throw new AppError(403, 'No tienes permisos para modificar esta puja.');
      }

      // RN04: El monto ofertado es irrevocable para el postor; solo puede editar su nota de coordinación
      if (
        !isAdmin &&
        req.body.amount !== undefined &&
        Number(req.body.amount) !== Number(existing.amount)
      ) {
        throw new AppError(
          403,
          'RN04: Las pujas son vinculantes e irrevocables. Como postor solo puedes editar la nota de coordinación; el importe no puede alterarse.'
        );
      }

      const updates = {};
      if (isAdmin && req.body.amount !== undefined) {
        updates.amount = assertPositiveNumber(req.body.amount, 'amount');
      }
      if (req.body.note !== undefined) {
        updates.note = String(req.body.note).trim();
      }

      const saved = await bids.update(conn, bidId, updates);
      if (isAdmin && updates.amount !== undefined) {
        await bids.recalculateAuctionPrice(conn, existing.auctionId);
      }
      return saved;
    });

    res.status(200).json(updated);
  });

  const deleteBid = asyncHandler(async (req, res) => {
    const bidId = parsePositiveId(req.params.id);

    if (req.user.role !== 'admin') {
      throw new AppError(
        403,
        'RN04: Las pujas registradas no pueden ser anuladas por el postor.'
      );
    }

    await runTx(async (conn) => {
      const existing = await bids.findById(bidId, conn);
      if (!existing) {
        throw new AppError(404, 'Puja no encontrada.');
      }

      await bids.remove(conn, bidId);
      await bids.recalculateAuctionPrice(conn, existing.auctionId);
    });

    res.status(200).json({
      message: 'Puja eliminada y precio actual recalculado.',
      id: bidId,
    });
  });

  return { listBids, getBidById, createBid, updateBid, deleteBid };
}

export const {
  listBids,
  getBidById,
  createBid,
  updateBid,
  deleteBid,
} = createBidController();

