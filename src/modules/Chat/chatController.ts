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
import { bot, sendTelegramDocument } from '@/hook/AIReply';
import FormData from 'form-data';

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

      const senderId = req.user?.id;
      if (!senderId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const messagesToSave: any[] = [];

      // ✅ Fix type req.files
      if (req.files) {
        const files = req.files as any;
        if (files['image']) {
          for (const img of files['image']) {
            messagesToSave.push({
              conversationId,
              // content: (img as any).path,
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              content: (img as any).secure_url || (img as any).path,
              type: 'image',
            });
          }
        }

        if (files['file']) {
          for (const f of files['file']) {
            messagesToSave.push({
              conversationId,
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              content: (f as any).secure_url || (f as any).path,
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
              fileName: (f as any).originalname || (f as any).filename,
              type: 'file',
            });
          }
        }
      }

      // Nếu có text
      if (content) {
        messagesToSave.push({
          conversationId,
          content,
          type: 'text',
        });
      }

      const savedMessages: any[] = [];

      for (const msg of messagesToSave) {
        // Lưu vào DB
        // eslint-disable-next-line no-await-in-loop
        const message = await chatService.SendMessage(msg, senderId);
        // eslint-disable-next-line no-await-in-loop
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar _id')
          .lean();

        savedMessages.push(populatedMessage);
        // eslint-disable-next-line no-await-in-loop
        const conversation = await Conversation.findById(
          conversationId
        ).populate('participants', '_id psid tgid');
        if (!conversation) {
          throw new Error('Conversation not found');
        }

        // ✅ Emit socket
        const io = req.app.get('io');
        io.to(conversationId).emit('newMessage', populatedMessage);
        conversation.participants.forEach((participant: any) => {
          io.to(participant._id.toString()).emit(
            'newMessagePreview',
            populatedMessage
          );
        });

        // ✅ Forward sang FB/Telegram
        const fbParticipant = (conversation?.participants as any[]).find(
          (p) => p?.psid
        );
        if (fbParticipant?.psid) {
          // eslint-disable-next-line no-await-in-loop
          await this.SendMessageFb(fbParticipant.psid, msg.content, msg.type);
        }

        const tgParticipant = (conversation?.participants as any[]).find(
          (p) => p?.tgid
        );
        if (tgParticipant?.tgid && !fromTelegram) {
          // eslint-disable-next-line no-await-in-loop
          await this.SendMessageTelegramApi(
            tgParticipant.tgid,
            msg.content,
            msg.type,
            msg.fileName
          );
        }
      }
      // console.log(savedMessages);
      return res.status(200).json({
        message: 'Send Success',
        data: savedMessages,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  // Đặt ngoài class
  sendMessageToTelegram = async (chatId: string, aiReply: string) => {
    const imageRegex = /(https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif))/i;
    const match = aiReply.match(imageRegex);

    try {
      if (match) {
        const imageUrl = match[1];
        await bot.sendPhoto(chatId, imageUrl);

        const textOnly = aiReply
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(imageRegex, '')
          .trim();

        if (textOnly) {
          await bot.sendMessage(chatId, textOnly);
        }
      } else {
        await bot.sendMessage(chatId, aiReply);
      }
    } catch (error) {
      console.error('❌ Lỗi khi gửi message đến Telegram:', error);
    }
  };

  async SendMessageTelegramApi(
    chatId: string,
    content: string,
    type: 'text' | 'image' | 'file',
    fileName?: string
  ) {
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      // let url = '';
      let body: any = {};
      if (type === 'text') {
        body = { chat_id: chatId, text: content };
        await axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          body,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else if (type === 'image') {
        const imgResponse = await axios.get(content, {
          responseType: 'arraybuffer',
        });
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', Buffer.from(imgResponse.data), 'image.jpg');

        await axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
          formData,
          { headers: formData.getHeaders() }
        );

        console.log('✅ Telegram image sent successfully!');
      } else if (type === 'file') {
        await sendTelegramDocument(chatId, content, fileName);
      }
    } catch (error: any) {
      console.error(
        '❌ Error sending Telegram message:',
        error.response?.data || error.message
      );
      throw error;
    }
  }
  async SendMessageFb(
    userPsid: string,
    content: string,
    type: 'text' | 'image' | 'file'
  ) {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN;
    try {
      let payload: any;

      if (type === 'text') {
        payload = { text: content };
      } else if (type === 'image') {
        payload = {
          attachment: {
            type: 'image',
            payload: { url: content, is_reusable: true },
          },
        };
      } else if (type === 'file') {
        payload = {
          attachment: {
            type: 'file',
            payload: { url: content, is_reusable: true },
          },
        };
      }

      const response = await axios.post(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: userPsid },
          message: payload,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error(
        '❌ Error sending FB message:',
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
