import { Router } from 'express';
import conversationController from './conversationController';
import verifyTokenMiddleware from '@/middlewares/chat.middlewares';

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
  conversationController.deleteConversationId
);
ConversationRouter.get(
  '/fullConversation/:conversationId',
  conversationController.getFullConversation
);
export default ConversationRouter;
