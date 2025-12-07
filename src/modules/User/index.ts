import { Router } from 'express';
import userController from './userController';
import verifyTokenMiddleware from '../../middlewares/chat.middlewares';
import {
  GetVerifyEmailTokenMiddleWare,
  LoginMiddleware,
  RegisterMiddleware,
} from '../../middlewares/user.middlewares';
import uploadCloud from '../../utils/upload';
import verifyAdminRole, { verifyOwnerOrAdmin } from '../../middlewares/auth.middlewares';
import { loginLimiter } from '@/middlewares/loginLimiter.ts 17';

export const UserRouter = Router();

UserRouter.post('/register', RegisterMiddleware,verifyTokenMiddleware,verifyAdminRole, userController.Register);
UserRouter.post(
  '/admin/create-staff',
  verifyTokenMiddleware,
  verifyAdminRole,
  userController.CreateStaff
);

UserRouter.get('/all',verifyTokenMiddleware,verifyAdminRole, userController.getAllUser);
UserRouter.post('/login',loginLimiter, LoginMiddleware,userController.Login);
UserRouter.get('/logout', verifyTokenMiddleware, userController.Logout);
UserRouter.put(
  '/update/:id',
  uploadCloud.single('avatar'),
  verifyTokenMiddleware,
  verifyOwnerOrAdmin,
  userController.UpdateUserById
);
UserRouter.delete(
  '/deleteUser/:id',
   verifyTokenMiddleware,
    verifyAdminRole,
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
UserRouter.get('/getUser', verifyTokenMiddleware, userController.getUser);
UserRouter.get('/getUserById/:userId', userController.getUserById);
UserRouter.get(
  "/search",
  verifyTokenMiddleware,
  userController.SearchUser
);

