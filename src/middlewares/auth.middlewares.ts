import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../hook/AuthenticatedRequest';

const unauthorizedMessage = {
  status: 403,
  message: 'Bạn không có quyền truy cập vào tài nguyên này',
};

const verifyAdminRole = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!(req as any).user) {
      return res.status(401).json({ message: 'Lỗi xác thực: Không có thông tin người dùng.' });
    }
    const userRole = (req as any).user.role;
    if (userRole === 'admin') {
      next();
    } else {
      return res
        .status(unauthorizedMessage.status)
        .json({ message: unauthorizedMessage.message });
    }
  } catch (error) {
    console.error('Lỗi kiểm tra vai trò:', error);
    return res
      .status(500)
      .json({ message: 'Lỗi máy chủ nội bộ khi kiểm tra quyền' });
  }
};
export const verifyOwnerOrAdmin = (req, res, next) => {
  const userId = req.params.id;
  const requesterId = req.user.id;
  const role = req.user.role;

  // Nếu là admin -> cho phép luôn
  if (role === "admin") {
    return next();
  }

  // Nếu không phải admin -> chỉ được sửa chính mình
  if (requesterId !== userId) {
    return res.status(403).json({
      message: "Bạn không có quyền cập nhật user này",
    });
  }

  next();
};

export default verifyAdminRole;
