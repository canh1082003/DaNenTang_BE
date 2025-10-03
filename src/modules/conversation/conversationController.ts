import { HttpStatusCode } from '@/common/constants';
import { NextFunction, Request, Response } from 'express';
import conversationService from './conversationService';
import { AuthenticatedRequest } from '@/hook/AuthenticatedRequest';
import Message from '@/databases/entities/Message';
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

  // async createGroupConversation(
  //   req: AuthenticatedRequest,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     const { name, participants } = req.body;
  //     const adminId = req.user?.id;
  //     const conversation = await conversationService.createGroupConversation({
  //       name,
  //       admin: adminId,
  //       participants: [...participants, adminId],
  //     });

  //     return res.status(HttpStatusCode.OK).json({
  //       message: 'Create group success',
  //       data: conversation,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     next(error);
  //   }
  // }
  async assignAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId, agentId } = req.body;

      const conversation = await conversationService.assignAgent(
        conversationId,
        agentId
      );

      // socket notify agent
      const io = req.app.get('io');
      io.to(agentId).emit('assignedConversation', conversation);

      return res.status(HttpStatusCode.OK).json({
        message: 'Assign agent success',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // AI detect intent -> assign leader
  async assignLeader(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversationId, department } = req.body;

      const conversation = await conversationService.assignLeader(
        conversationId,
        department
      );
      if (!conversation) {
        return res.status(HttpStatusCode.NOT_FOUND).json({
          message: 'Conversation not found',
        });
      }

      const io = req.app.get('io');

      // socket notify leader
      if (conversation.leader) {
        io.to(conversation.leader._id.toString()).emit(
          'newAssignedConversation',
          conversation
        );
      }

      return res.status(HttpStatusCode.OK).json({
        message: 'Assign leader success',
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  // API tạo room group thủ công (nếu cần)
  async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, botId, username, platform } = req.body;
      const conversation = await conversationService.createGroupConversation(
        userId,
        botId,
        username,
        platform
      );

      return res.status(HttpStatusCode.OK).json({
        message: 'Create group conversation success',
        data: conversation,
      });
    } catch (error) {
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
  async deleteMessage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { messageId } = req.params;
      const { deleteType } = req.query;
      const userId = req.user.id;
      const io = req.app.get('io');

      if (!deleteType || (deleteType !== 'me' && deleteType !== 'everyone')) {
        return res
          .status(400)
          .json({ message: 'deleteType must be "me" or "everyone"' });
      }

      const updated = await conversationService.deleteMessage(
        messageId,
        userId,
        deleteType
      );
      if (!updated) {
        throw new Error('Message not found or not authorized');
      }
      if (deleteType === 'me') {
        // chỉ emit cho chính user xoá
        io.to(userId).emit('messageDeletedForMe', { messageId });
      } else if (deleteType === 'everyone') {
        // emit cho cả room
        io.to(updated.conversation.toString()).emit(
          'messageDeletedForEveryone',
          { messageId }
        );
      }

      return res.status(200).json({ message: 'Delete message success' });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
      const io = req.app.get('io');

      await conversationService.deleteConversation(conversationId, userId);

      // chỉ emit cho user đã xoá
      io.to(userId).emit('conversationDeletedForMe', { conversationId });

      return res.status(200).json({ message: 'Delete conversation success' });
    } catch (error) {
      next(error);
    }
  }
}
export default new ConversationController();
