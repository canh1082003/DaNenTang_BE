import { Router } from 'express';
import userRouterController from './userController';
import verifyTokenMiddleware from '@/middlewares/chat.middlewares';
import {
  GetVerifyEmailTokenMiddleWare,
  LoginMiddleware,
  RegisterMiddleware,
} from '@/middlewares/user.middlewares';

export const UserRouter = Router();
UserRouter.get(
  '/webhook',
  userRouterController.WebhookFacebook.bind(userRouterController)
);

// nhắn tin => check có acc hay chưa => có => pass ,chưa register rồi login => nếu lần đầu nhắn tạo conversation => gửi tin nhắn (/sendMessage)

UserRouter.post(
  '/webhook',
  userRouterController.WebhookFacebook.bind(userRouterController)
);
UserRouter.post(
  '/telegram/send-message',
  userRouterController.sendMessageTelegram
);
UserRouter.post('/telegram/webhook', userRouterController.WebhookTelegram);

UserRouter.post(
  '/telegram/register-webhook',
  userRouterController.registerTelegramWebhook
);
UserRouter.post('/register', RegisterMiddleware, userRouterController.Register);
UserRouter.get('/all', userRouterController.getAllUser);
UserRouter.post('/login', LoginMiddleware, userRouterController.Login);
UserRouter.put(
  '/update/:id',
  verifyTokenMiddleware,
  userRouterController.UpdateUserById
);
UserRouter.delete(
  '/deleteUser/:id',
  // verifyTokenMiddleware,
  userRouterController.deleteUserById
);
UserRouter.post(
  '/verifyEmail',
  GetVerifyEmailTokenMiddleWare,
  userRouterController.verifyEmail
);
UserRouter.post(
  '/SendComfirmCode/:email',
  userRouterController.SendComfirmCode
);
UserRouter.get(
  '/online-status',
  verifyTokenMiddleware,
  userRouterController.getAllUsersWithOnlineStatus
);
