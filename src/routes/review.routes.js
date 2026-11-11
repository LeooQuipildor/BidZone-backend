import { Router } from 'express';
import {
  listReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} from '../controllers/review.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', listReviews);
router.get('/:id', validateParamId('id'), getReviewById);
router.post('/', createReview);
router.put('/:id', validateParamId('id'), updateReview);
router.patch('/:id', validateParamId('id'), updateReview);
router.delete('/:id', validateParamId('id'), deleteReview);

export default router;

