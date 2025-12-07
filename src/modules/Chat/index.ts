import { Router } from 'express';
import chatController from './chatController';
import verifyTokenMiddleware from '../../middlewares/chat.middlewares';
import uploadCloud from '../../utils/upload';
import { checkUserInConversation } from '../../middlewares/auth.middlewares';
const ChatRouter = Router();

ChatRouter.post(
  '/send/:conversationId',
  verifyTokenMiddleware,
  checkUserInConversation,
  uploadCloud.fields([
    { name: 'image', maxCount: 5 },
    { name: 'file', maxCount: 5 },
  ]),
  chatController.SendMessage.bind(chatController)
);
ChatRouter.get('/:conversationId', chatController.getRoomChatByConversation);
export default ChatRouter;
