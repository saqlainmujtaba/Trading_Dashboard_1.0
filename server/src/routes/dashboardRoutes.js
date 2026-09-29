import express from 'express';
import protect from '../middleware/authMiddleware.js';
import {
  getDashboardData,
  createAccount,
  updateAccount,
  deleteAccount,
  createPlannedAccount,
  updatePlannedAccount,
  deletePlannedAccount,
  createTrade,
  importTrades,
  updateTrade,
  deleteTrade,
  createPayout,
  updatePayout,
  deletePayout,
} from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);

router.get('/', getDashboardData);

router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.delete('/accounts/:id', deleteAccount);

router.post('/planned-accounts', createPlannedAccount);
router.put('/planned-accounts/:id', updatePlannedAccount);
router.delete('/planned-accounts/:id', deletePlannedAccount);

router.post('/trades', createTrade);
router.post('/trades/import', importTrades);
router.put('/trades/:id', updateTrade);
router.delete('/trades/:id', deleteTrade);

router.post('/payouts', createPayout);
router.put('/payouts/:id', updatePayout);
router.delete('/payouts/:id', deletePayout);

export default router;
