import { Router } from 'express';
import chatController from './chatController';
import verifyTokenMiddleware from '@/middlewares/chat.middlewares';
import uploadCloud from '@/utils/upload';
const ChatRouter = Router();

ChatRouter.post(
  '/send',
  verifyTokenMiddleware,
  uploadCloud.fields([
    { name: 'image', maxCount: 5 },
    { name: 'file', maxCount: 5 },
  ]),
  chatController.SendMessage.bind(chatController)
);
ChatRouter.get('/:conversationId', chatController.getRoomChatByConversation);
export default ChatRouter;
