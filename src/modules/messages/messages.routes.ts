import { Router } from 'express';
import { messagesController } from './messages.controller';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';

const router = Router();
router.use(requireAuth, requireActiveStatus);

router.get('/conversations', messagesController.getConversations);
router.get('/search-users', messagesController.searchUsers);
router.get('/:userId', messagesController.getChatHistory);
router.post('/:userId', messagesController.sendMessage);

export default router;
