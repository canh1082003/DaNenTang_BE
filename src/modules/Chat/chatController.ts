import { HttpStatusCode } from '@/common/constants';
import { NextFunction, Request, Response } from 'express';
import chatService from './chatService';
import { validationResult } from 'express-validator';
import 'express-async-errors';
import BadRequestException from '@/common/exception/BadRequestException';
import { AuthenticatedRequest } from '@/hook/AuthenticatedRequest';
import Conversation from '@/databases/entities/Conversation';
import Message from '@/databases/entities/Message';
import axios from 'axios';

class ChatController {
  async SendMessage(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { conversationId, content, fromTelegram } = req.body;

      if (!conversationId) {
        return res.status(400).json({ message: 'conversationId is required' });
      }

      if (!conversationId) {
        return res.status(400).json({ message: 'conversationId is required' });
      }

      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const message = await chatService.SendMessage(
        {
          conversationId,
          content,
          // type: messageType as 'text' | 'image' | 'file',
          type: 'text',
        },
        senderId
      );

      // Populate sender để FE có đủ thông tin ngay tin đầu
      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username avatar _id')
        .lean();

      const conversation = await Conversation.findById(conversationId).populate(
        'participants',
        '_id psid tgid'
      );
      console.log(conversation);
      const fbParticipant = (conversation?.participants as any[]).find(
        (p) => p?.psid
      );
      if (fbParticipant?.psid) {
        await this.SendMessageFb(fbParticipant.psid, content);
      }
      const tgParticipant = (conversation?.participants as any[]).find(
        (p) => p?.tgid
      );
      console.log(tgParticipant);
      if (tgParticipant?.tgid && !fromTelegram) {
        await this.SendMessageTelegramApi(tgParticipant.tgid, content);
      }

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const io = req.app.get('io');

      // Phát tới room cuộc trò chuyện cho những client đang mở phòng
      io.to(conversationId).emit('newMessage', populatedMessage);

      // Phát preview cho sidebar của TẤT CẢ participants (bao gồm người gửi)
      conversation.participants.forEach((participant: any) => {
        io.to(participant._id.toString()).emit(
          'newMessagePreview',
          populatedMessage
        );
      });

      // }
      return res.status(HttpStatusCode.OK).json({
        message: 'Send Success',
        data: populatedMessage,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async SendMessageFb(userPsid: string, text: string) {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN;
    console.log(userPsid);
    try {
      const response = await axios.post(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: userPsid },
          message: { text },
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('✅ FB Message sent:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        '❌ Error sending FB message:',
        error.response?.data || error.message
      );
      throw error;
    }
  }
  async SendMessageTelegramApi(chatId: string, text: string) {
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      console.log(chatId);
      const response = await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: chatId,
          text,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('✅ Telegram message sent:', response.data);
      return response.data;
    } catch (error: any) {
      console.error(
        '❌ Error sending Telegram message:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async getRoomChatByConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { conversationId } = req.params;
      const data = await chatService.getRoomChatByConversation(conversationId);
      return res.status(HttpStatusCode.OK).json({
        message: 'Get conversation success',
        data,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
}
export default new ChatController();
