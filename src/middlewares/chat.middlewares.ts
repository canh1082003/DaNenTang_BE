import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { AuthenticatedRequest } from '@/hook/AuthenticatedRequest';
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
    const decoded = jwt.verify(token, env_jwt);

    (req as any).user = { id: (decoded as any).id, token };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res
        .status(errorMessages.token.status)
        .json({ message: errorMessages.token.message });
    }

    // Lỗi server khác
    console.error('Lỗi xác thực token:', error);
    return res
      .status(errorMessages.server.status)
      .json({ message: errorMessages.server.message });
  }
};

export default verifyTokenMiddleware;
