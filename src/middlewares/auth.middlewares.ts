import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../hook/AuthenticatedRequest';
import Conversation from '../databases/entities/Conversation';

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

export const checkUserInConversation = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.conversationId;
    console.log(userId,conversationId);
    if (!conversationId) {
      return res.status(400).json({ message: 'Thiếu conversationId' });
    }

    // Tìm conversation
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Không tìm thấy cuộc trò chuyện' });
    }

    // Kiểm tra user có nằm trong participants hay không
    const isParticipant = conversation.participants.includes(userId);

    if (!isParticipant) {
      return res.status(403).json({
        message: 'Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này'
      });
    }

    next();

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

export default verifyAdminRole;
