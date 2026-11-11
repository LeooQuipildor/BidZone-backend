import { withTransaction } from '../config/db.js';
import * as auctionModel from '../models/auction.model.js';
import * as reviewModel from '../models/review.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';

const ROLE_CONTEXTS = ['comprador_a_vendedor', 'vendedor_a_comprador'];

function parseRating(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1 || num > 5) {
    throw new AppError(400, 'La calificación debe ser un número entero entre 1 y 5 estrellas.');
  }
  return num;
}

export function createReviewController(deps = {}) {
  const reviews = deps.reviewModel || reviewModel;
  const auctions = deps.auctionModel || auctionModel;
  const runTx = deps.withTransaction || withTransaction;

  const listReviews = asyncHandler(async (req, res) => {
    const { auctionId, targetUserId, reviewerId } = req.query;

    const parsedAuctionId = auctionId ? parsePositiveId(auctionId) : undefined;
    if (auctionId && !parsedAuctionId) {
      throw new AppError(400, 'El filtro auctionId debe ser un entero positivo.');
    }

    const parsedTargetId = targetUserId ? parsePositiveId(targetUserId) : undefined;
    if (targetUserId && !parsedTargetId) {
      throw new AppError(400, 'El filtro targetUserId debe ser un entero positivo.');
    }

    const parsedReviewerId = reviewerId ? parsePositiveId(reviewerId) : undefined;
    if (reviewerId && !parsedReviewerId) {
      throw new AppError(400, 'El filtro reviewerId debe ser un entero positivo.');
    }

    const list = await reviews.findAll({
      auctionId: parsedAuctionId,
      targetUserId: parsedTargetId,
      reviewerId: parsedReviewerId,
    });
    res.status(200).json(list);
  });

  const getReviewById = asyncHandler(async (req, res) => {
    const reviewId = parsePositiveId(req.params.id);
    const review = await reviews.findById(reviewId);
    if (!review) {
      throw new AppError(404, 'Calificación no encontrada.');
    }
    res.status(200).json(review);
  });

  const createReview = asyncHandler(async (req, res) => {
    requireFields(req.body, ['auctionId', 'rating']);

    const auctionId = parsePositiveId(req.body.auctionId);
    if (!auctionId) {
      throw new AppError(400, 'El campo auctionId debe ser un entero positivo.');
    }

    const rating = parseRating(req.body.rating);
    const comment = req.body.comment ? String(req.body.comment).trim() : '';

    const created = await runTx(async (conn) => {
      const auction = await auctions.findById(auctionId, conn);
      if (!auction) {
        throw new AppError(404, 'Subasta no encontrada.');
      }

      // RN07: Calificación permitida únicamente tras el cierre formal
      if (auction.status !== 'finalizada') {
        throw new AppError(
          409,
          'RN07: Solo se pueden calificar subastas que hayan finalizado formalmente.'
        );
      }

      if (!auction.winnerId) {
        throw new AppError(
          409,
          'RN07: Esta subasta finalizó sin ganador adjudicado, por lo que no admite calificación.'
        );
      }

      const isAdmin = req.user.role === 'admin';
      const isWinner = Number(req.user.id) === Number(auction.winnerId);
      const isSeller = Number(req.user.id) === Number(auction.sellerId);

      let targetUserId;
      let roleContext;

      if (isWinner) {
        targetUserId = auction.sellerId;
        roleContext = 'comprador_a_vendedor';
      } else if (isSeller) {
        targetUserId = auction.winnerId;
        roleContext = 'vendedor_a_comprador';
      } else if (isAdmin) {
        targetUserId = parsePositiveId(req.body.targetUserId);
        if (!targetUserId || targetUserId === Number(req.user.id)) {
          throw new AppError(400, 'Debes indicar un targetUserId válido distinto al autor.');
        }
        roleContext = req.body.roleContext
          ? assertEnumValue(req.body.roleContext, ROLE_CONTEXTS, 'roleContext')
          : 'comprador_a_vendedor';
      } else {
        throw new AppError(
          403,
          'RN07: Solo el vendedor o el comprador ganador pueden calificar esta operación.'
        );
      }

      if (await reviews.existsByAuctionAndReviewer(conn, auctionId, req.user.id)) {
        throw new AppError(
          409,
          'RN07: Ya has emitido una calificación para esta operación.'
        );
      }

      const saved = await reviews.create(conn, {
        auctionId,
        reviewerId: req.user.id,
        targetUserId,
        rating,
        comment,
        roleContext,
      });

      await reviews.recalculateUserReputation(conn, targetUserId);
      return saved;
    });

    res.status(201).json(created);
  });

  const updateReview = asyncHandler(async (req, res) => {
    const reviewId = parsePositiveId(req.params.id);

    const updated = await runTx(async (conn) => {
      const existing = await reviews.findById(reviewId, conn);
      if (!existing) {
        throw new AppError(404, 'Calificación no encontrada.');
      }

      const isAdmin = req.user.role === 'admin';
      const isAuthor = Number(existing.reviewerId) === Number(req.user.id);
      if (!isAdmin && !isAuthor) {
        throw new AppError(403, 'Solo el autor de la reseña o un administrador puede editarla.');
      }

      const updates = {};
      if (req.body.rating !== undefined) {
        updates.rating = parseRating(req.body.rating);
      }
      if (req.body.comment !== undefined) {
        updates.comment = String(req.body.comment).trim();
      }
      if (isAdmin && req.body.roleContext !== undefined) {
        updates.roleContext = assertEnumValue(
          req.body.roleContext,
          ROLE_CONTEXTS,
          'roleContext'
        );
      }

      const saved = await reviews.update(conn, reviewId, updates);
      await reviews.recalculateUserReputation(conn, existing.targetUserId);
      return saved;
    });

    res.status(200).json(updated);
  });

  const deleteReview = asyncHandler(async (req, res) => {
    const reviewId = parsePositiveId(req.params.id);

    await runTx(async (conn) => {
      const existing = await reviews.findById(reviewId, conn);
      if (!existing) {
        throw new AppError(404, 'Calificación no encontrada.');
      }

      const isAdmin = req.user.role === 'admin';
      const isAuthor = Number(existing.reviewerId) === Number(req.user.id);
      if (!isAdmin && !isAuthor) {
        throw new AppError(403, 'Solo el autor de la reseña o un administrador puede eliminarla.');
      }

      await reviews.remove(conn, reviewId);
      await reviews.recalculateUserReputation(conn, existing.targetUserId);
    });

    res.status(200).json({
      message: 'Calificación eliminada y reputación recalculada.',
      id: reviewId,
    });
  });

  return {
    listReviews,
    getReviewById,
    createReview,
    updateReview,
    deleteReview,
  };
}

export const {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} = createReviewController();

