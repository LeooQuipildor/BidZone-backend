import { Router } from 'express';
import {
  listAuctions,
  getAuctionById,
  createAuction,
  updateAuction,
  deleteAuction,
} from '../controllers/auction.controller.js';
import { verifyToken, optionalAuth } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

// Rutas públicas de catálogo (optionalAuth habilita desbloqueo de contacto RN05 si corresponde)
router.get('/', optionalAuth, listAuctions);
router.get('/:id', validateParamId('id'), optionalAuth, getAuctionById);

// Rutas privadas para gestión de subastas
router.post('/', verifyToken, createAuction);
router.put('/:id', validateParamId('id'), verifyToken, updateAuction);
router.patch('/:id', validateParamId('id'), verifyToken, updateAuction);
router.delete('/:id', validateParamId('id'), verifyToken, deleteAuction);

export default router;

