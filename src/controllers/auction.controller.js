import * as auctionModel from '../models/auction.model.js';
import * as bidModel from '../models/bid.model.js';
import { AppError, asyncHandler } from '../middlewares/error.middleware.js';
import {
  assertEnumValue,
  assertPositiveNumber,
  parsePositiveId,
  requireFields,
} from '../middlewares/validate.middleware.js';
import { toMySqlUtcDatetime } from '../utils/date.js';

const AUCTION_STATUSES = ['activa', 'finalizada', 'cancelada'];
const AUCTION_SORTS = ['endingSoon', 'priceAsc', 'priceDesc', 'newest'];
const DEFAULT_AUCTION_IMAGE_URL =
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80';

export function createAuctionController(deps = {}) {
  const auctions = deps.auctionModel || auctionModel;
  const bids = deps.bidModel || bidModel;

  const listAuctions = asyncHandler(async (req, res) => {
    await auctions.syncExpiredAuctions();

    const { category, status, search, sellerId, sortBy } = req.query;
    if (status && status !== 'todas') {
      assertEnumValue(status, AUCTION_STATUSES, 'status');
    }
    if (sortBy) {
      assertEnumValue(sortBy, AUCTION_SORTS, 'sortBy');
    }

    const parsedSellerId = sellerId ? parsePositiveId(sellerId) : undefined;
    if (sellerId && !parsedSellerId) {
      throw new AppError(400, 'El filtro sellerId debe ser un entero positivo.');
    }

    const list = await auctions.findAll({
      category,
      status,
      search,
      sellerId: parsedSellerId,
      sortBy,
    });
    res.status(200).json(list);
  });

  const getAuctionById = asyncHandler(async (req, res) => {
    await auctions.syncExpiredAuctions();

    const auctionId = parsePositiveId(req.params.id);
    const raw = await auctions.findByIdRaw(auctionId);
    if (!raw) {
      throw new AppError(404, 'Subasta no encontrada.');
    }

    const mapped = auctions.mapAuctionRow(raw);
    const auctionBids = await bids.findAll({ auctionId });

    // RN05: Solo revelar email/teléfono entre vendedor y ganador al cierre formal (o admin)
    const canSeeUnlockedContact =
      raw.status === 'finalizada' &&
      raw.winner_id !== null &&
      req.user &&
      (req.user.role === 'admin' ||
        Number(req.user.id) === Number(raw.seller_id) ||
        Number(req.user.id) === Number(raw.winner_id));

    const seller = {
      id: Number(raw.seller_id),
      name: raw.seller_name,
      city: raw.seller_city,
      reputation: Number(raw.seller_reputation),
      ...(canSeeUnlockedContact
        ? { email: raw.seller_email, phone: raw.seller_phone }
        : {}),
    };

    const winner = raw.winner_id
      ? {
          id: Number(raw.winner_id),
          name: raw.winner_name,
          city: raw.winner_city,
          reputation: Number(raw.winner_reputation),
          ...(canSeeUnlockedContact
            ? { email: raw.winner_email, phone: raw.winner_phone }
            : {}),
        }
      : null;

    res.status(200).json({
      ...mapped,
      bids: auctionBids,
      seller,
      winner,
      contactUnlocked: Boolean(canSeeUnlockedContact),
    });
  });

  const createAuction = asyncHandler(async (req, res) => {
    requireFields(req.body, ['title', 'basePrice', 'minIncrement', 'endTime']);

    const title = String(req.body.title).trim();
    if (title.length < 3) {
      throw new AppError(400, 'El título debe tener al menos 3 caracteres.');
    }

    const basePrice = assertPositiveNumber(req.body.basePrice, 'basePrice');
    const minIncrement = assertPositiveNumber(req.body.minIncrement, 'minIncrement');
    const endTimeSql = toMySqlUtcDatetime(req.body.endTime);

    if (!endTimeSql) {
      throw new AppError(400, 'La fecha de cierre (endTime) no es válida.');
    }
    if (new Date(req.body.endTime).getTime() <= Date.now()) {
      throw new AppError(400, 'La fecha de cierre debe ser posterior al momento actual.');
    }

    let sellerId = req.user.id;
    if (req.user.role === 'admin' && req.body.sellerId !== undefined) {
      const requestedSeller = parsePositiveId(req.body.sellerId);
      if (!requestedSeller) {
        throw new AppError(400, 'El campo sellerId debe ser un entero positivo.');
      }
      sellerId = requestedSeller;
    }

    const created = await auctions.create({
      title,
      description: req.body.description ? String(req.body.description).trim() : '',
      category: req.body.category ? String(req.body.category).trim() : 'Tecnología',
      imageUrl: req.body.imageUrl?.trim()
        ? String(req.body.imageUrl).trim()
        : DEFAULT_AUCTION_IMAGE_URL,
      basePrice,
      minIncrement,
      sellerId,
      status: 'activa',
      endTime: endTimeSql,
    });

    res.status(201).json(created);
  });

  const updateAuction = asyncHandler(async (req, res) => {
    const auctionId = parsePositiveId(req.params.id);
    const existing = await auctions.findById(auctionId);
    if (!existing) {
      throw new AppError(404, 'Subasta no encontrada.');
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = Number(existing.sellerId) === Number(req.user.id);
    if (!isAdmin && !isOwner) {
      throw new AppError(403, 'Solo el vendedor propietario o un administrador puede editar esta subasta.');
    }

    const bidCount = await auctions.countBids(auctionId);

    // RN08: Si ya hay pujas registradas, impedir cambios en reglas de precio/tiempo salvo admin
    if (bidCount > 0 && !isAdmin) {
      if (
        req.body.basePrice !== undefined &&
        Number(req.body.basePrice) !== Number(existing.basePrice)
      ) {
        throw new AppError(
          409,
          'RN08: No se puede modificar el precio base porque la subasta ya cuenta con ofertas registradas.'
        );
      }
      if (
        req.body.minIncrement !== undefined &&
        Number(req.body.minIncrement) !== Number(existing.minIncrement)
      ) {
        throw new AppError(
          409,
          'RN08: No se puede modificar el incremento mínimo porque la subasta ya tiene ofertas activas.'
        );
      }
      if (req.body.endTime !== undefined) {
        const nextEndSql = toMySqlUtcDatetime(req.body.endTime);
        const currentEndSql = toMySqlUtcDatetime(existing.endTime);
        if (nextEndSql !== currentEndSql) {
          throw new AppError(
            409,
            'RN08: No se puede alterar la fecha de cierre una vez recibidas ofertas.'
          );
        }
      }
    }

    const updates = {};
    if (req.body.title !== undefined) {
      const cleanTitle = String(req.body.title).trim();
      if (cleanTitle.length < 3) {
        throw new AppError(400, 'El título debe tener al menos 3 caracteres.');
      }
      updates.title = cleanTitle;
    }
    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim();
    }
    if (req.body.category !== undefined) {
      updates.category = String(req.body.category).trim();
    }
    if (req.body.imageUrl !== undefined) {
      updates.imageUrl = String(req.body.imageUrl).trim();
    }
    if (req.body.basePrice !== undefined) {
      const nextBase = assertPositiveNumber(req.body.basePrice, 'basePrice');
      updates.basePrice = nextBase;
      if (bidCount === 0) {
        updates.currentPrice = nextBase;
      }
    }
    if (req.body.minIncrement !== undefined) {
      updates.minIncrement = assertPositiveNumber(req.body.minIncrement, 'minIncrement');
    }
    if (req.body.endTime !== undefined) {
      const nextEndSql = toMySqlUtcDatetime(req.body.endTime);
      if (!nextEndSql) {
        throw new AppError(400, 'La fecha de cierre (endTime) no es válida.');
      }
      updates.endTime = nextEndSql;
    }
    if (req.body.status !== undefined) {
      const nextStatus = assertEnumValue(req.body.status, AUCTION_STATUSES, 'status');
      if (nextStatus !== existing.status && nextStatus !== 'cancelada') {
        throw new AppError(
          403,
          'No se puede finalizar manualmente una subasta; el cierre ocurre automáticamente al vencer su plazo. Solo es posible cancelarla.'
        );
      }
      if (nextStatus === 'cancelada' && bidCount > 0 && !isAdmin) {
        throw new AppError(
          409,
          'No puedes cancelar una subasta que ya tiene pujas activas.'
        );
      }
      updates.status = nextStatus;
    }

    const updated = await auctions.update(auctionId, updates);
    res.status(200).json(updated);
  });

  const deleteAuction = asyncHandler(async (req, res) => {
    const auctionId = parsePositiveId(req.params.id);
    const existing = await auctions.findById(auctionId);
    if (!existing) {
      throw new AppError(404, 'Subasta no encontrada.');
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = Number(existing.sellerId) === Number(req.user.id);
    if (!isAdmin && !isOwner) {
      throw new AppError(403, 'No tienes permisos para eliminar esta subasta.');
    }

    const bidCount = await auctions.countBids(auctionId);
    if (bidCount > 0 && !isAdmin) {
      throw new AppError(
        409,
        'RN08: No puedes eliminar una subasta que ya tiene pujas registradas.'
      );
    }

    await auctions.remove(auctionId);
    res.status(200).json({
      message: 'Subasta eliminada correctamente.',
      id: auctionId,
    });
  });

  return {
    listAuctions,
    getAuctionById,
    createAuction,
    updateAuction,
    deleteAuction,
  };
}

export const {
  listAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
} = createAuctionController();

