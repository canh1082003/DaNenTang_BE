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
  // async SendMessage(
  //   req: AuthenticatedRequest,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   const errors = validationResult(req);
  //   if (!errors.isEmpty()) {
  //     throw new BadRequestException(errors.array());
  //   }
  //   try {
  //     const { conversationId, content, fromTelegram } = req.body;

  //     if (!conversationId) {
  //       return res.status(400).json({ message: 'conversationId is required' });
  //     }

  //     if (!conversationId) {
  //       return res.status(400).json({ message: 'conversationId is required' });
  //     }

  //     const senderId = req.user?.id;
  //     if (!senderId) {
  //       return res.status(401).json({ message: 'Unauthorized' });
  //     }
  //     let messagesToSave: any[] = [];
  //     if (req.files) {
  //       const files = req.files as unknown as {
  //         [fieldname: string]: Express.Multer.File[];
  //       };
  //     }

  //     if (files['image']) {
  //       for (const img of files['image']) {
  //         messagesToSave.push({
  //           conversationId,
  //           content: (img as any).path, // Cloudinary URL
  //           type: 'image',
  //         });
  //       }
  //     }

  //     if (files['file']) {
  //       for (const f of files['file']) {
  //         messagesToSave.push({
  //           conversationId,
  //           content: (f as any).path, // Cloudinary URL
  //           type: 'file',
  //         });
  //       }
  //     }

  //     // Nếu có text kèm theo
  //     if (content) {
  //       messagesToSave.push({
  //         conversationId,
  //         content,
  //         type: 'text',
  //       });
  //     }
  //     const message = await chatService.SendMessage(
  //       {
  //         conversationId,
  //         content,
  //         // type: messageType as 'text' | 'image' | 'file',
  //         type: 'text',
  //       },
  //       senderId
  //     );

  //     // Populate sender để FE có đủ thông tin ngay tin đầu
  //     const populatedMessage = await Message.findById(message._id)
  //       .populate('sender', 'username avatar _id')
  //       .lean();

  //     const conversation = await Conversation.findById(conversationId).populate(
  //       'participants',
  //       '_id psid tgid'
  //     );
  //     console.log(conversation);
  //     const fbParticipant = (conversation?.participants as any[]).find(
  //       (p) => p?.psid
  //     );
  //     if (fbParticipant?.psid) {
  //       await this.SendMessageFb(fbParticipant.psid, msg.content, msg.type);
  //     }
  //     const tgParticipant = (conversation?.participants as any[]).find(
  //       (p) => p?.tgid
  //     );
  //     console.log(tgParticipant);
  //     if (tgParticipant?.tgid && !fromTelegram) {
  //       await this.SendMessageTelegramApi(
  //         tgParticipant.tgid,
  //         msg.content,
  //         msg.type
  //       );
  //     }

  //     if (!conversation) {
  //       throw new Error('Conversation not found');
  //     }

  //     const io = req.app.get('io');

  //     // Phát tới room cuộc trò chuyện cho những client đang mở phòng
  //     io.to(conversationId).emit('newMessage', populatedMessage);

  //     // Phát preview cho sidebar của TẤT CẢ participants (bao gồm người gửi)
  //     conversation.participants.forEach((participant: any) => {
  //       io.to(participant._id.toString()).emit(
  //         'newMessagePreview',
  //         populatedMessage
  //       );
  //     });

  //     // }
  //     return res.status(HttpStatusCode.OK).json({
  //       message: 'Send Success',
  //       data: populatedMessage,
  //     });
  //   } catch (error) {
  //     console.log(error);
  //     next(error);
  //   }
  // }
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
              // content: (f as any).path,
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
            msg.type
          );
        }
      }

      return res.status(200).json({
        message: 'Send Success',
        data: savedMessages,
      });
    } catch (error) {
      console.log(error);
      next(error);
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
  async SendMessageTelegramApi(
    chatId: string,
    content: string,
    type: 'text' | 'image' | 'file'
  ) {
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      let url = '';
      let body: any = {};
      console.log(body);
      if (type === 'text') {
        url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        body = { chat_id: chatId, text: content };
      } else if (type === 'image') {
        url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        body = { chat_id: chatId, photo: content };
      } else if (type === 'file') {
        url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
        body = { chat_id: chatId, document: content };
      }

      const response = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
      });

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
