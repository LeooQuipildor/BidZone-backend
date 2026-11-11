import { Router } from 'express';
import {
  listReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
} from '../controllers/report.controller.js';
import { verifyToken, requireRole } from '../middlewares/auth.middleware.js';
import { validateParamId } from '../middlewares/validate.middleware.js';

const router = Router();

router.use(verifyToken);

router.get('/', listReports);
router.get('/:id', validateParamId('id'), getReportById);
router.post('/', createReport);
router.put('/:id', validateParamId('id'), updateReport);
router.patch('/:id', validateParamId('id'), updateReport);
router.delete('/:id', validateParamId('id'), requireRole('admin'), deleteReport);

export default router;

