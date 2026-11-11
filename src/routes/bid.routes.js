import { Router } from 'express';
import {
  listBids,
  getBidById,
  createBid,
  updateBid,
  deleteBid,
} from '../controllers/bid.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', listBids);
router.get('/:id', validateParamId('id'), getBidById);
router.post('/', createBid);
router.put('/:id', validateParamId('id'), updateBid);
router.patch('/:id', validateParamId('id'), updateBid);
router.delete('/:id', validateParamId('id'), requireRole('admin'), deleteBid);

export default router;

