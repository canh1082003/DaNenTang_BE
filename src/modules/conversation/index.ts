import { Router } from 'express';
import conversationController from './conversationController';
import verifyTokenMiddleware from '../../middlewares/chat.middlewares';

const ConversationRouter = Router();

ConversationRouter.post(
  '/create',
  verifyTokenMiddleware,
  conversationController.createPrivateConversation
);

ConversationRouter.post(
  '/group',
  verifyTokenMiddleware,
  conversationController.createGroup
);
ConversationRouter.get(
  '/all',
  verifyTokenMiddleware,
  conversationController.getAllConversations
);

ConversationRouter.get(
  '/:conversationId',
  verifyTokenMiddleware,
  conversationController.getConversationDetails
);

ConversationRouter.post(
  '/:conversationId/member',
  conversationController.addMember
);

ConversationRouter.delete(
  '/:conversationId/member/:userId',
  conversationController.removeParticipant
);
ConversationRouter.delete(
  '/delete/:conversationId',
  verifyTokenMiddleware,
  conversationController.deleteConversationId
);
ConversationRouter.get(
  '/fullConversation/:conversationId',
  conversationController.getFullConversation
);

// xóa tin nhắn (cho chính mình hoặc cho tất cả mọi người)
ConversationRouter.delete(
  '/message/:messageId',
  verifyTokenMiddleware,

  conversationController.deleteMessage
);

ConversationRouter.delete(
  '/allMessage/:conversationId',
  verifyTokenMiddleware,
  conversationController.deleteConversation
);

ConversationRouter.get(
  '/admin/all',
  verifyTokenMiddleware,
  conversationController.getAllConversationsForAdmin
);

export default ConversationRouter;
