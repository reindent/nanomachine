import express from 'express';
import * as chatController from '../controllers/chatController';
import * as messageController from '../controllers/messageController';

const router = express.Router();

// Chat routes
router.get('/', chatController.getChats);
router.get('/:id', chatController.getChatById);
router.post('/', chatController.createChat);
router.put('/:id', chatController.updateChat);
router.delete('/:id', chatController.deleteChat);

// Message routes (nested under chats)
router.get('/:chatId/messages', messageController.getMessages);
router.post('/:chatId/messages', messageController.createMessage);
router.delete('/messages/:id', messageController.deleteMessage);

export default router;
