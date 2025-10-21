import { Router } from 'express';
import userController from './userController';
import verifyTokenMiddleware from '@/middlewares/chat.middlewares';
import {
  GetVerifyEmailTokenMiddleWare,
  LoginMiddleware,
  RegisterMiddleware,
} from '@/middlewares/user.middlewares';

export const UserRouter = Router();

UserRouter.post('/register', RegisterMiddleware, userController.Register);
UserRouter.get('/all', userController.getAllUser);
UserRouter.post('/login', LoginMiddleware, userController.Login);
UserRouter.put(
  '/update/:id',
  verifyTokenMiddleware,
  userController.UpdateUserById
);
UserRouter.delete(
  '/deleteUser/:id',
  userController.deleteUserById
);
UserRouter.post(
  '/verifyEmail',
  GetVerifyEmailTokenMiddleWare,
  userController.verifyEmail
);
UserRouter.post(
  '/SendComfirmCode/:email',
  userController.SendComfirmCode
);
UserRouter.get(
  '/online-status',
  verifyTokenMiddleware,
  userController.getAllUsersWithOnlineStatus
);
