import { ResponseCustom } from '../../utils/expressCustom';
import { NextFunction, Request } from 'express';
import TelegramService from './TelegramService';
import { HttpStatusCode } from '../../utils/httpStatusCode';
import conversationService from '../conversation/conversationService';
import chatController from '../Chat/chatController';
import chatService from '../Chat/chatService';
import {
  bot,
  detectIntent,
  getAIReply,
  getTelegramFileUrl,
} from '../../hook/AIReply';
import Message from '../../databases/entities/Message';
import Conversation from '../../databases/entities/Conversation';
import User from '../../databases/entities/User';
import BadRequestException from '../../common/exception/BadRequestException';
import AuthErrorCode from '../../utils/AuthErrorCode';
import { v4 as uuidv4 } from 'uuid';

class TelegramController {
  async sendMessageTelegram(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const { chatId, message } = req.body;

      if (!chatId || !message) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.INVALID_REQUEST,
          errorMessage: 'Missing chatId or message',
        });
      }

      await bot.sendMessage(chatId, message);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Message sent to Telegram!',
      });
    } catch (error) {
      console.error('❌ Error sending message to Telegram:', error);
      next(error);
    }
  }

  async WebhookTelegram(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const body = req.body;

      // Bỏ qua tin nhắn từ bot
      if (body.message?.from?.is_bot) {
        return res.status(HttpStatusCode.OK).json({
          httpStatusCode: HttpStatusCode.OK,
          data: 'IGNORED_BOT_MESSAGE',
        });
      }

      if (!body.message) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.INVALID_REQUEST,
          errorMessage: 'Invalid Telegram payload',
        });
      }

      const chatId = body.message.chat.id.toString();
      const firstName = body.message.chat.first_name || 'Unknown';
      const lastName = body.message.chat.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();

      // 1️⃣ Tìm hoặc tạo user Telegram
      let user = await User.findOne({ tgid: chatId });
      if (!user) {
        const exists = await User.findOne({ username: fullName });
        const safeName = exists ? `${fullName}_${Date.now()}` : fullName;

        user = await User.create({
          tgid: chatId,
          username: safeName,
          email: `${chatId}@telegram.local`,
          password: `tg_${uuidv4()}`,
        });
      }

      // 2️⃣ Tìm hoặc tạo conversation
      let conversation = await Conversation.findOne({
        type: 'group',
        participants: { $all: [user._id, process.env.BOT_USER_ID] },
      });

      if (!conversation) {
        conversation = await conversationService.createGroupConversation(
          user.id.toString(),
          process.env.BOT_USER_ID!,
          fullName,
          'Telegram'
        );
      }

      // 3️⃣ Lấy nội dung message
      let content = '';
      let type: 'text' | 'image' | 'file' = 'text';
      let fileName = '';

      if (body.message.text) {
        content = body.message.text;
        type = 'text';
      } else if (body.message.photo) {
        const largestPhoto = body.message.photo[body.message.photo.length - 1];
        content = await getTelegramFileUrl(largestPhoto.file_id);
        type = 'image';
      } else if (body.message.document) {
        const fileId = body.message.document.file_id;
        content = await getTelegramFileUrl(fileId);
        fileName = body.message.document.file_name || 'unknown_file';
        type = 'file';
      }

      if (!content) {
        console.warn('⚠️ Empty message content, ignoring.');
        return res.status(HttpStatusCode.OK).json({
          httpStatusCode: HttpStatusCode.OK,
          data: 'EMPTY_MESSAGE_IGNORED',
        });
      }

      // 4️⃣ Lưu message người dùng gửi
      const message = await chatService.SendMessage(
        {
          conversationId: conversation.id.toString(),
          content,
          type,
          fileName,
        },
        user.id.toString()
      );

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username avatar _id')
        .lean();

      const io = req.app.get('io');
      io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
      conversation.participants.forEach((p: any) => {
        io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
      });

      // 5️⃣ Phân tích intent
      const intent = await detectIntent(content);

      // 6️⃣ Gọi AI trả lời nếu chưa có department hoặc intent đặc biệt
      if (
        !conversation.assignedDepartment ||
        intent === 'buy_product' ||
        intent === 'view_product'
      ) {
        console.log(
          `[ROUTER] AI sẽ trả lời vì department=null hoặc intent=${intent}`
        );

        const messages = await chatService.getRoomChatByConversation(
          conversation.id
        );
        const conversationHistory = messages.map((m: any) => ({
          role:
            m.sender?._id?.toString() === process.env.BOT_USER_ID
              ? 'assistant'
              : 'user',
          content: [{ type: 'text', text: m.content }],
        }));

        const limitedHistory = conversationHistory.slice(-10);
        const aiReply = await getAIReply(content, undefined, limitedHistory);

        // Lưu message bot
        const botMessage = await chatService.SendMessage(
          {
            conversationId: conversation.id.toString(),
            content: aiReply,
            type: 'text',
          },
          process.env.BOT_USER_ID!
        );

        const populatedBotMessage = await Message.findById(botMessage._id)
          .populate('sender', 'username avatar _id')
          .lean();

        io.to(conversation.id.toString()).emit(
          'newMessage',
          populatedBotMessage
        );

        // 🧠 Gửi trả lại Telegram
        await chatController.sendMessageToTelegram(chatId, aiReply);

        console.log('✅ AI đã trả lời cho người dùng Telegram:', chatId);

        if (intent === 'buy_product' || intent === 'view_product') {
          console.log(`[ROUTER] Intent ${intent} → bỏ qua assign department`);
          return res.status(HttpStatusCode.OK).json({
            httpStatusCode: HttpStatusCode.OK,
            data: 'EVENT_RECEIVED',
          });
        }
      } else {
        console.log(
          `[ROUTER] Conversation đã có department=${conversation.assignedDepartment}, bỏ qua AI`
        );
      }

      // 7️⃣ Assign department nếu cần
      // if (intent !== 'other') {
      //   if (
      //     !conversation.assignedDepartment ||
      //     conversation.assignedDepartment !== intent
      //   ) {
      //     const updatedConversation = await conversationService.assignLeader(
      //       conversation.id,
      //       intent
      //     );

      //     console.log(
      //       `[ROUTER] Cập nhật department từ ${
      //         conversation.assignedDepartment || 'none'
      //       } → ${intent}`
      //     );

      //     if (updatedConversation) {
      //       conversation.assignedDepartment =
      //         updatedConversation.assignedDepartment;
      //       conversation.leader = updatedConversation.leader;

      //       if (updatedConversation.leader) {
      //         io.to(updatedConversation.leader._id.toString()).emit(
      //           'newAssignedConversation',
      //           updatedConversation
      //         );
      //       }
      //     } else {
      //       console.log('[ROUTER] assignLeader trả về null');
      //     }
      //   } else {
      //     console.log(`[ROUTER] Department đã là ${intent} → giữ nguyên`);
      //   }
      // } else {
      //   console.log('>>> Current department:', conversation.assignedDepartment);
      // }
      // 7️⃣ Xử lý intent và cập nhật department động
      // const intent = await detectIntent(content);

      if (intent && intent !== 'other') {
        // Luôn cập nhật lại department theo intent mới nhất
        const oldDepartment = conversation.assignedDepartment;

        // Nếu khác department cũ → cập nhật mới
        if (oldDepartment !== intent) {
          const updatedConversation = await conversationService.assignLeader(
            conversation.id,
            intent,
          );

          if (updatedConversation) {
            conversation.assignedDepartment =
              updatedConversation.assignedDepartment;
            conversation.leader = updatedConversation.leader;

            console.log(
              `[ROUTER] Cập nhật department từ ${oldDepartment || 'none'} → ${
                updatedConversation.assignedDepartment
              }`
            );

            // const io = req.app.get('io');
            const payload = {
              conversationId:
                updatedConversation._id || conversation._id?.toString(),
              oldDepartment: oldDepartment || 'none',
              newDepartment: updatedConversation.assignedDepartment,
            };

            // 🔔 Emit đến leader mới
            if (updatedConversation.leader) {
              io.to(updatedConversation.leader._id.toString()).emit(
                'newAssignedConversation',
                updatedConversation
              );
            }

            // 🔔 Thông báo đến tất cả participant trong conversation
            updatedConversation.participants.forEach((p: any) => {
              io.to(p._id.toString()).emit('departmentUpdated', payload);
            });
          } else {
            console.log('[ROUTER] assignLeader trả về null');
          }
        } else {
          console.log(`[ROUTER] Department vẫn là ${intent} → giữ nguyên`);
        }
      } else {
        console.log(
          `[ROUTER] Intent là 'other' hoặc không xác định → không thay đổi department`
        );
      }

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'EVENT_RECEIVED',
      });
    } catch (error) {
      console.error('❌ Error handling Telegram webhook:', error);
      next(error);
    }
  }
  async registerTelegramWebhook(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const data = await TelegramService.registerTelegramWebhookDirect();
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data,
      });
    } catch (error) {
      console.error('❌ Error registering Telegram webhook:', error);
      next(error);
    }
  }

  async deleteTelegramWebhook(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const data = await TelegramService.deleteTelegramWebhookDirect();
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data,
      });
    } catch (error) {
      console.error('❌ Error deleting Telegram webhook:', error);
      next(error);
    }
  }
}
export default new TelegramController();
