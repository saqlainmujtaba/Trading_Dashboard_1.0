import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  createShare,
  getPublicShare,
  listMyShares,
  revokeShare,
} from '../controllers/shareController.js';

const router = express.Router();

router.post('/', protect, createShare);
router.get('/', protect, listMyShares);
router.get('/:token', getPublicShare);
router.delete('/:id', protect, revokeShare);

export default router;
