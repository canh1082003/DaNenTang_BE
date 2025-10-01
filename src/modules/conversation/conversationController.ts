import { HttpStatusCode } from '@/common/constants';
import { NextFunction, Response } from 'express';
import conversationService from './conversationService';
import { AuthenticatedRequest } from '@/hook/AuthenticatedRequest';
class ConversationController {
  async createPrivateConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user?.id;

      const conversation = await conversationService.createPrivateConversation(
        currentUserId,
        targetUserId
      );

      return res.status(HttpStatusCode.OK).json({
        message: 'Create conversation success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async createGroupConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { name, participants } = req.body;
      const adminId = req.user?.id;
      const conversation = await conversationService.createGroupConversation({
        name,
        admin: adminId,
        participants: [...participants, adminId],
      });

      return res.status(HttpStatusCode.OK).json({
        message: 'Create group success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async getAllConversations(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const conversations =
        await conversationService.getAllConversations(userId);

      return res.status(HttpStatusCode.OK).json({
        message: 'Get all conversations success',
        data: conversations,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  // Lấy thông tin chi tiết của một cuộc trò chuyện
  async getConversationDetails(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      // const userId = req.user?.id;

      const conversation =
        await conversationService.getConversationById(conversationId);

      return res.status(HttpStatusCode.OK).json({
        message: 'Get conversation details success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  // Thêm thành viên vào nhóm chat
  async addMember(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      const { userIds } = req.body;
      // const currentUserId = req.user?._id || req.params;

      const conversation = await conversationService.addMember(
        conversationId,
        userIds
      );

      return res.status(HttpStatusCode.OK).json({
        message: 'Add Member success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  // Xóa thành viên khỏi nhóm chat
  async removeParticipant(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId, userId } = req.params;
      // const currentUserId = req.user?._id || req.params;

      const conversation = await conversationService.removeParticipant(
        conversationId,
        userId
      );

      return res.status(HttpStatusCode.OK).json({
        message: 'Remove participant success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async deleteConversationId(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      const conversation =
        await conversationService.deleteConversationId(conversationId);

      return res.status(HttpStatusCode.OK).json({
        message: 'Delete conversation success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async getFullConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      const conversation =
        await conversationService.getFullConversation(conversationId);
      return res.status(HttpStatusCode.OK).json({
        message: 'Get full conversation success',
        data: conversation,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}
export default new ConversationController();
