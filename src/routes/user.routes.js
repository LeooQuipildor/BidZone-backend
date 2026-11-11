import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', listUsers);
router.get('/:id', validateParamId('id'), getUserById);
router.post('/', requireRole('admin'), createUser);
router.put('/:id', validateParamId('id'), updateUser);
router.patch('/:id', validateParamId('id'), updateUser);
router.delete('/:id', validateParamId('id'), requireRole('admin'), deleteUser);

export default router;

