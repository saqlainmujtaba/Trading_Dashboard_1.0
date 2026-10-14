import express from 'express';
import {
  registerUser,
  loginUser,
  createDemoSession,
  verifyEmail,
  resendVerificationCode,
  requestPasswordReset,
  resetPassword,
  getMe,
  getTraderProfile,
  updateTraderProfile,
} from '../controllers/authController.js';
import protect from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationCode);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.post('/demo', createDemoSession);
router.get('/me', protect, getMe);
router.get('/profile', protect, getTraderProfile);
router.put('/profile', protect, updateTraderProfile);

export default router;
