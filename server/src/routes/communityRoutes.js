import express from 'express';
import protect from '../middleware/authMiddleware.js';
import { getConnections, getConversations, getMessages, respondFriendRequest, searchUsers, sendFriendRequest, sendMessage } from '../controllers/communityController.js';

const router = express.Router();
router.use(protect);
router.get('/users', searchUsers);
router.get('/connections', getConnections);
router.get('/conversations', getConversations);
router.post('/requests/:userId', sendFriendRequest);
router.patch('/requests/:requestId', respondFriendRequest);
router.get('/messages/:userId', getMessages);
router.post('/messages/:userId', sendMessage);

export default router;
