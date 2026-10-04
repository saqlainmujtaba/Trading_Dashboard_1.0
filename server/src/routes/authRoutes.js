import express from 'express';
import {
  registerUser,
  verifyEmail,
  loginUser,
  requestPasswordReset,
  resetPassword,
  createDemoSession,
  getMe,
  getTraderProfile,
  updateTraderProfile,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/verify-email', verifyEmail);
router.post('/login', loginUser);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/demo', createDemoSession);
router.get('/me', protect, getMe);
router.get('/profile', protect, getTraderProfile);
router.put('/profile', protect, updateTraderProfile);

export default router;
