import express from 'express';
import protect from '../middleware/authMiddleware.js';
import requireAdmin from '../middleware/adminMiddleware.js';
import { getAdminUserData, listAdminUsers, updateUserRole } from '../controllers/adminController.js';

const router = express.Router();
router.use(protect, requireAdmin);
router.get('/users', listAdminUsers);
router.get('/users/:id', getAdminUserData);
router.patch('/users/:id/role', updateUserRole);

export default router;
