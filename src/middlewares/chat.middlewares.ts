import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '../hook/AuthenticatedRequest';
import { Response, NextFunction } from 'express';

dotenv.config();

// Định nghĩa các thông báo lỗi
const errorMessages = {
  auth: {
    status: 401,
    message: 'Không có token hoặc token không hợp lệ',
  },
  token: {
    status: 401,
    message: 'Token không hợp lệ hoặc đã hết hạn',
  },
  server: {
    status: 500,
    message: 'Lỗi máy chủ nội bộ',
  },
};

const verifyTokenMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(errorMessages.auth.status)
        .json({ message: errorMessages.auth.message });
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res
        .status(errorMessages.auth.status)
        .json({ message: errorMessages.auth.message });
    }
    const token = parts[1];
    const env_jwt = process.env.JWT_SECRET;
    if (!env_jwt) {
      return res
        .status(500)
        .json({ message: 'Thiếu JWT_KEY trong biến môi trường' });
    }
    const decoded = jwt.verify(token, env_jwt) as { id: string; role: string };

    (req as any).user = {
      id: (decoded as any).id,
      token,
      role: (decoded as any).role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const decoded = jwt.decode(
        req.headers.authorization?.split(' ')[1] || ''
      );
      const userId = (decoded as any)?.id;
      const activeUsers = new Set<string>();
      if (userId && activeUsers.has(userId)) {
        activeUsers.delete(userId);
        console.log(
          `🧹 Token expired, removed user ${userId} from activeUsers`
        );
      }
      return res
        .status(401)
        .json({
          message: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
        });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(errorMessages.token.status)
        .json({ message: errorMessages.token.message });
    }

    console.error('Lỗi xác thực token:', error);
    return res
      .status(errorMessages.server.status)
      .json({ message: errorMessages.server.message });
  }
};

export default verifyTokenMiddleware;
