import { NextFunction, Request, Response } from 'express';
import userRouterService from './userService';
import { HttpStatusCode } from '../../common/constants';
import BadRequestException from '../../common/exception/BadRequestException';
import AuthErrorCode from '../../utils/AuthErrorCode';
import 'express-async-errors';
import { validationResult } from 'express-validator';
import { ResponseCustom } from '../../utils/expressCustom';
import { Hashing } from '../../utils/hashing';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../../utils/mail';
import Unauthorized from '../../common/exception/Unauthorized';
import { clientMap } from '../../socket';
import { AuthenticatedRequest } from '../../hook/AuthenticatedRequest';

import { redis } from '@/config/redisClient';

class UserController {
  async Register(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { username, email, password, confirmPassword, department } =
        req.body;
      if (password !== confirmPassword) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_MATCH,
          errorMessage: 'Password not match',
        });
      }
      const userExists = await userRouterService.findUserByEmail(email);
      if (userExists) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.EXISTS_USER,
          errorMessage: 'User Already exists',
        });
      }
      const user = await userRouterService.register(
        username,
        email,
        password,
        department
      );
      const token = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await sendEmail({
        email,
        subject: 'Verify email',
        message: `Your verify token is ${user.verifyEmailToken}`,
      });
      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: { email: user.email, token },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async SendComfirmCode(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { email } = req.params;
      const user = await userRouterService.findUserByEmail(email);
      if (!user) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_FOUND,
          errorMessage: 'User not found',
        });
      }
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await sendEmail({
        email,
        subject: 'Verify email',
        message: `Your verify token is ${user.verifyEmailToken}`,
      });
      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: { email: user.email, token },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  // async Login(req: Request, res: ResponseCustom, next: NextFunction) {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     throw new BadRequestException(errors.array());
  //   }
  //   try {
  //     const { email, password } = req.body;
  //     const user = await userRouterService.findUserByEmail(email);
  //     if (!user) {
  //       throw new Unauthorized({
  //         errorCode: AuthErrorCode.INVALID_EMAIL,
  //         errorMessage: 'Not found any account with this email',
  //       });
  //     }
  //     const passwordcompare = await Hashing.compare(user.password, password);
  //     if (!passwordcompare) {
  //       throw new Unauthorized({
  //         errorCode: AuthErrorCode.WRONG_PASSWORD,
  //         errorMessage: 'Wrong password',
  //       });
  //     }
  //     await redis.sadd('online_users', user.id);
  //     await redis.set(`online_user:${user.id}`, '1', 'EX', 60);
  //     const userIds = await redis.smembers('online_users');

  //     for (const id of userIds) {
  //       const ttlKey = `online_user:${id}`;

  //       // eslint-disable-next-line no-await-in-loop
  //       const stillAlive = await redis.get(ttlKey);
  //       if (!stillAlive) {
  //       // eslint-disable-next-line no-await-in-loop
  //         await redis.srem('online_users', id);
  //       }
  //     }

  //     const onlineCount = await redis.scard('online_users');
  //    const MAX_ACTIVE_USERS = Number(process.env.MAX_ACTIVE_USERS);
  //     if (onlineCount > MAX_ACTIVE_USERS) {
  //       await redis.srem('online_users', user.id);
  //       await redis.del(`online_user:${user.id}`);
  //       return res.status(HttpStatusCode.TOO_MANY_REQUESTS).json({
  //         httpStatusCode: HttpStatusCode.TOO_MANY_REQUESTS,
  //         data: 'Hệ thống đang quá tải, vui lòng thử lại sau vài phút.',
  //       });
  //     }
  //     const token = jwt.sign(
  //       { id: user.id, role: user.role },
  //       process.env.JWT_SECRET || 'your-secret-key',
  //       { expiresIn: '24h' }
  //     );
  //     return res.status(HttpStatusCode.OK).json({
  //       httpStatusCode: HttpStatusCode.OK,
  //       data: {
  //         id: user.id,
  //         email: user.email,
  //         username: user.username,
  //         isVerifyEmail: user.isVerifyEmail,
  //         role: user.role,
  //         department: user.department,
  //         avatar: user.avatar,
  //         token,
  //       },
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     next(error);
  //   }
  // }
  async Login(req: Request, res: ResponseCustom, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new BadRequestException(errors.array());
  }

  try {
    const { email, password } = req.body;
    const user = await userRouterService.findUserByEmail(email);
    if (!user) {
      // throw new Unauthorized("Email không tồn tại");
      throw new Unauthorized({
          errorCode: AuthErrorCode.INVALID_EMAIL,
          errorMessage: 'Không tìm thấy tài khoản với email này',
    });
  }
    const passwordcompare = await Hashing.compare(user.password, password);
    if (!passwordcompare) {
      // throw new Unauthorized("Sai mật khẩu");
       throw new Unauthorized({
          errorCode: AuthErrorCode.INVALID_EMAIL,
          errorMessage: 'Bạn đã nhập sai mật khẩu, vui lòng thử lại',
    });
    }

    // 1. Add user to Redis SET (global list)
    await redis.sAdd("online_users", user.id);

    // 2. TTL riêng cho từng user
    await redis.set(`online_user:${user.id}`, "1", { EX: 60 });

    // 3. Dọn dẹp user đã hết hạn (dùng GET để tránh lỗi EXISTS)
    const userIds = await redis.sMembers("online_users");
    for (const id of userIds) {
      // eslint-disable-next-line no-await-in-loop
      const stillAlive = await redis.get(`online_user:${id}`);
      if (!stillAlive) {
        // eslint-disable-next-line no-await-in-loop
        await redis.srem("online_users", id);
      }
    }

    // 4. Lấy số user online
    const onlineCount = await redis.sCard("online_users");
    const MAX_ACTIVE_USERS = Number(process.env.MAX_ACTIVE_USERS || 50);

    // 5. Kiểm tra limit
    if (onlineCount > MAX_ACTIVE_USERS) {
      await redis.sRem("online_users", user.id);
      await redis.del(`online_user:${user.id}`);

      return res.status(HttpStatusCode.SERVICE_UNAVAILABLE).json({
        httpStatusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
        data: "Hệ thống đang quá tải, vui lòng thử lại sau.",
      });
    }

    // Tạo token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" }
    );

    return res.status(HttpStatusCode.OK).json({
      httpStatusCode: HttpStatusCode.OK,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerifyEmail: user.isVerifyEmail,
        role: user.role,
        department: user.department,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
}

  async verifyEmail(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { verifyEmailToken } = req.body;
      await userRouterService.findAndVerifyEmailUser(verifyEmailToken);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Verify success',
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async getAllUser(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const user = await userRouterService.getAllUser();
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async deleteUserById(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { id } = req.params;
      await userRouterService.deleteUserById(id);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Delete User Succes',
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async UpdateUserById(
    req: AuthenticatedRequest,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const data = req.body;
      if (req.file) {
        data.avatar = req.file.path;
      }
      const user = await userRouterService.updateUserById(id, data);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async getAllUsersWithOnlineStatus(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      // Lấy danh sách user IDs đang online từ clientMap
      const onlineUserIds = Array.from(clientMap.keys());

      // Lấy danh sách tất cả user với trạng thái online/offline
      const users =
        await userRouterService.getAllUsersWithOnlineStatus(onlineUserIds);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: {
          users,
          onlineCount: onlineUserIds.length,
          totalCount: users.length,
        },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  Logout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const activeUsers = new Set<string>();
      if (userId) {
        activeUsers.delete(userId);
      }

      return res.status(200).json({
        httpStatusCode: 200,
        data: 'Đăng xuất thành công',
        activeNow: activeUsers.size,
      });
    } catch (error) {
      next(error);
    }
  }
  async getUser(
    req: AuthenticatedRequest,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Unauthorized({
          errorCode: AuthErrorCode.NOT_FOUND,
          errorMessage: 'User not found',
        });
      }

      const user = await userRouterService.findUserById(userId);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async getUserById(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { userId } = req.params;
      if (!userId) {
        throw new Unauthorized({
          errorCode: AuthErrorCode.NOT_FOUND,
          errorMessage: 'User not found',
        });
      }

      const user = await userRouterService.findUserById(userId);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async CreateStaff(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }

    try {
      const { username, email, password, confirmPassword, department } =
        req.body;

      if (password !== confirmPassword) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_MATCH,
          errorMessage: 'Password not match',
        });
      }

      const userExists = await userRouterService.findUserByEmail(email);
      if (userExists) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.EXISTS_USER,
          errorMessage: 'User Already exists',
        });
      }
      // Create staff via service
      const user = await userRouterService.createStaff({
        username,
        email,
        password,
        department,
      });

      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: { id: user.id, email: user.email, role: user.role },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async SearchUser(
    req: AuthenticatedRequest,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const { keyword } = req.query;
      if (!keyword || typeof keyword !== 'string') {
        throw new BadRequestException({
          errorCode: AuthErrorCode.INVALID_QUERY,
          errorMessage:
            'Query parameter "key word" is required and must be a string',
        });
      }
      const allUsers = await userRouterService.searchStaff(keyword);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: allUsers,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}
export default new UserController();
