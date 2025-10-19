import { NextFunction, Request, Response } from 'express';
import userRouterService from './userService';
import { HttpStatusCode } from '@/common/constants';
import BadRequestException from '@/common/exception/BadRequestException';
import AuthErrorCode from '@/utils/AuthErrorCode';
import 'express-async-errors';
import { validationResult } from 'express-validator';
import { ResponseCustom } from '@/utils/expressCustom';
import { Hashing } from '@/utils/hashing';
import jwt from 'jsonwebtoken';
import { sendEmail } from '@/utils/mail';
import Unauthorized from '@/common/exception/Unauthorized';
import { clientMap } from '@/socket';
import axios from 'axios';
import {
  bot,
  detectIntent,
  getAIReply,
  getTelegramFileUrl,
  getUserName,
} from '@/hook/AIReply';
import Conversation from '@/databases/entities/Conversation';
import conversationService from '../conversation/conversationService';
import chatService from '../Chat/chatService';
import { AuthenticatedRequest } from '@/hook/AuthenticatedRequest';
import Message from '@/databases/entities/Message';
import User from '@/databases/entities/User';
import { v4 as uuidv4 } from 'uuid';
import chatController from '../Chat/chatController';

class UserRouterController {
  async Register(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { username, email, password, confirmPassword } = req.body;
      if (password !== confirmPassword) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_MATCH,
          errorMessage: 'Password not match',
        });
      }
      const userExists = await userRouterService.findUserByEmail(email);
      if (userExists) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.EXISTS_USER,
          errorMessage: 'User Already exists',
        });
      }
      const user = await userRouterService.register(username, email, password);
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await sendEmail({
        email,
        subject: 'Verify email',
        message: `Your verify token is ${user.verifyEmailToken}`,
      });
      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: { email: user.email, token },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async SendComfirmCode(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { email } = req.params;
      const user = await userRouterService.findUserByEmail(email);
      if (!user) {
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_FOUND,
          errorMessage: 'User not found',
        });
      }
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      // eslint-disable-next-line @typescript-eslint/await-thenable
      await sendEmail({
        email,
        subject: 'Verify email',
        message: `Your verify token is ${user.verifyEmailToken}`,
      });
      return res.status(HttpStatusCode.CREATED).json({
        httpStatusCode: HttpStatusCode.CREATED,
        data: { email: user.email, token },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async Login(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { email, password } = req.body;
      const user = await userRouterService.findUserByEmail(email);
      if (!user) {
        throw new Unauthorized({
          errorCode: AuthErrorCode.INVALID_EMAIL,
          errorMessage: 'Not found any account with this email',
        });
      }
      const passwordcompare = await Hashing.compare(user.password, password);
      if (!passwordcompare) {
        throw new Unauthorized({
          errorCode: AuthErrorCode.WRONG_PASSWORD,
          errorMessage: 'Wrong password',
        });
      }
      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          isVerifyEmail: user.isVerifyEmail,
          token,
        },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async verifyEmail(req: Request, res: ResponseCustom, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestException(errors.array());
    }
    try {
      const { verifyEmailToken } = req.body;
      await userRouterService.findAndVerifyEmailUser(verifyEmailToken);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Verify success',
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async getAllUser(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const user = await userRouterService.getAllUser();
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async deleteUserById(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { id } = req.params;
      await userRouterService.deleteUserById(id);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Delete User Succes',
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async UpdateUserById(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = req.body;
      const user = await userRouterService.updateUserById(id, data);
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: user,
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  async getAllUsersWithOnlineStatus(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      // Lấy danh sách user IDs đang online từ clientMap
      const onlineUserIds = Array.from(clientMap.keys());

      // Lấy danh sách tất cả user với trạng thái online/offline
      const users =
        await userRouterService.getAllUsersWithOnlineStatus(onlineUserIds);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: {
          users,
          onlineCount: onlineUserIds.length,
          totalCount: users.length,
        },
      });
    } catch (error) {
      console.log(error);
      next(error);
    }
  }

  WebhookFacebook(
    req: AuthenticatedRequest,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      if (req.method === 'GET') {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          throw new BadRequestException(errors.array());
        }
        const VERIFY_TOKEN = process.env.MY_VERIFY_FB_TOKEN;
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = String(req.query['hub.challenge']);
        console.log(VERIFY_TOKEN, mode, token, challenge);
        // Xác minh webhook (GET /webhook)
        if (mode && token) {
          if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            if (typeof challenge === 'string') {
              return (res as Response)
                .status(HttpStatusCode.OK)
                .send(challenge);
            }
            throw new BadRequestException({
              errorCode: AuthErrorCode.INVALID_TOKEN,
              errorMessage: 'Challenge is not a valid string',
            });
          }
          throw new BadRequestException({
            errorCode: AuthErrorCode.INVALID_TOKEN,
            errorMessage: 'Verify token does not match',
          });
        }
      } else if (req.method === 'POST') {
        const body = req.body;
        if (body.object === 'page') {
          body.entry.forEach(async (entry: any) => {
            const webhookEvent = entry.messaging[0];

            const sender_psid = webhookEvent.sender.id;
            const page = process.env.FB_PAGE_TOKEN as string;

            if (webhookEvent.message) {
              const userProfile = await getUserName(sender_psid, page);
              const fullName = `${userProfile.first_name} ${userProfile.last_name}`;

              const { user, token } =
                await userRouterService.findOrCreateMessengerUser(
                  sender_psid,
                  fullName,
                  userProfile.profile_pic
                );
              (req as any).user = { id: user.id, token };
              await this.handleMessage(
                sender_psid,
                webhookEvent.message,
                req,
                userProfile.first_name
              );
            } else if (webhookEvent.postback) {
              await this.handlePostback(sender_psid, webhookEvent.postback);
            }
          });

          return res.status(HttpStatusCode.OK).json({
            httpStatusCode: HttpStatusCode.OK,
            data: 'EVENT_RECEIVED',
          });
        }
        throw new BadRequestException({
          errorCode: AuthErrorCode.NOT_FOUND,
          errorMessage: 'Invalid webhook object',
        });
      } else {
        throw new BadRequestException({
          errorCode: AuthErrorCode.INVALID_REQUEST,
          errorMessage: 'Unsupported HTTP method',
        });
      }

      // Xử lý sự kiện từ Facebook Messenger (POST /webhook)
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
  async sendMessage(
    sender_psid: string,
    reply: string,
    type: 'text' | 'image' | 'file'
  ) {
    const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
    try {
      let body: any = {};

      if (type === 'text') {
        body = {
          recipient: { id: sender_psid },
          message: { text: reply },
        };
      }
      // Nếu là ảnh, sử dụng sendPhoto API
      else if (type === 'image') {
        body = {
          recipient: { id: sender_psid },
          message: {
            attachment: {
              type: 'image',
              payload: { url: reply, is_reusable: true },
            },
          },
        };
      }
      // Nếu là file, sử dụng sendDocument API
      else if (type === 'file') {
        body = {
          recipient: { id: sender_psid },
          message: {
            attachment: {
              type: 'file',
              payload: { url: reply, is_reusable: true },
            },
          },
        };
      }

      const res = await axios.post(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_TOKEN}`,
        body,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      console.log('✅ Message sent!');
      return res.data;
    } catch (error: any) {
      console.error(
        '❌ Error sending message:',
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async handleMessage(
    sender_psid: string,
    received_message: any,
    req: Request & { user?: { id: string; token?: string } },
    displayName?: string
  ) {
    // 1. Tìm hoặc tạo user mapping với psid
    const userProfile = await getUserName(
      sender_psid,
      process.env.FB_PAGE_TOKEN!
    );
    let fullName = `${userProfile.first_name} ${userProfile.last_name}`;
    let user = await User.findOne({ psid: sender_psid });
    if (!user) {
      const exists = await User.findOne({ username: fullName });
      if (exists) {
        fullName = `${fullName}_${Date.now()}`;
      }
      user = await User.create({
        psid: sender_psid,
        username: fullName,
        email: `${sender_psid}@messenger.local`,
        password: `fb_${uuidv4()}`,
      });
    }

    // 2. Tìm hoặc tạo conversation
    let conversation = await Conversation.findOne({
      type: 'group',
      participants: { $all: [user._id, process.env.BOT_USER_ID] },
    });

    if (!conversation) {
      conversation = await conversationService.createGroupConversation(
        user.id.toString(),
        process.env.BOT_USER_ID!,
        fullName,
        'Facebook'
      );
    }
    let content = '';
    let type: 'text' | 'image' | 'file' = 'text';
    let fileName = '';
    // Kiểm tra nếu là text, ảnh hay file
    if (received_message.text) {
      content = received_message.text;
      type = 'text';
    } else if (
      received_message.attachments &&
      received_message.attachments[0].type === 'image'
    ) {
      const imageUrl = received_message.attachments[0].payload.url;
      content = imageUrl; // Lấy URL ảnh từ Facebook
      type = 'image';
    } else if (
      received_message.attachments &&
      received_message.attachments[0].type === 'file'
    ) {
      const fileUrl = received_message.attachments[0].payload.url;
      content = fileUrl;
      fileName = fileUrl.split('/').pop()?.split('?')[0];
      console.log(fileName);
      type = 'file';
    }

    // Đảm bảo content không rỗng trước khi lưu
    if (!content) {
      console.error('❌ Empty content received');
      return;
    }
    // 3. Lưu message user gửi
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

    // Optionally thêm displayName cho FE
    if (displayName) {
      (populatedMessage as any).senderName = displayName;
    }

    // 4. Emit socket message user gửi
    const io = req.app.get('io');
    io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
    conversation.participants.forEach((p: any) => {
      io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
    });
    const intent = await detectIntent(content);
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

      await this.sendMessageToFacebook(sender_psid, aiReply);
      io.to(conversation.id.toString()).emit('newMessage', populatedBotMessage);
      console.log('✅ AI đã trả lời cho người dùng Facebook:', sender_psid);

      // Nếu intent là "xem/mua hàng" thì KHÔNG gán department, dừng ở đây luôn
      if (intent === 'buy_product' || intent === 'view_product') {
        console.log(`[ROUTER] Intent ${intent} → bỏ qua assign department`);
        return;
      }
    } else {
      console.log(
        `[ROUTER] Conversation đã có department=${conversation.assignedDepartment}, bỏ qua AI`
      );
    }

    // ⚙️ Xử lý assign department bình thường cho các intent khác
    if (intent !== 'other') {
      if (
        !conversation.assignedDepartment ||
        conversation.assignedDepartment !== intent
      ) {
        const updatedConversation = await conversationService.assignLeader(
          conversation.id,
          intent
        );

        console.log(
          `[ROUTER] Cập nhật department từ ${
            conversation.assignedDepartment || 'none'
          } → ${intent}`
        );

        if (!updatedConversation) {
          console.log('[ROUTER] assignLeader trả về null');
          return;
        }

        const oldDepartment = conversation.assignedDepartment;
        conversation.assignedDepartment =
          updatedConversation.assignedDepartment;
        conversation.leader = updatedConversation.leader;

        if (updatedConversation.leader) {
          io.to(updatedConversation.leader._id.toString()).emit(
            'newAssignedConversation',
            updatedConversation
          );
        }

        const payload = {
          conversationId:
            updatedConversation._id || conversation._id?.toString(),
          oldDepartment: oldDepartment || 'none',
          newDepartment: updatedConversation.assignedDepartment,
        };

        updatedConversation.participants.forEach((p: any) => {
          io.to(p._id.toString()).emit('departmentUpdated', payload);
        });

        console.log(
          `[ROUTER] Broadcast department ${oldDepartment || 'none'} → ${
            updatedConversation.assignedDepartment
          }`
        );
      } else {
        console.log(`[ROUTER] Department đã là ${intent} → giữ nguyên`);
      }
    } else {
      console.log('>>> Current department:', conversation.assignedDepartment);
    }
  }

  async handlePostback(sender_psid: string, received_postback: any) {
    let response;

    // Lấy payload từ postback
    const payload = received_postback.payload;

    // Tạo phản hồi dựa trên payload
    if (payload === 'yes') {
      response = { text: 'Thanks!' };
    } else if (payload === 'no') {
      response = { text: 'Oops, try sending another image.' };
    }

    // Gửi phản hồi đến người dùng
    await this.callSendAPI(sender_psid, response);
  }
  async callSendAPI(sender_psid: string, response: any) {
    const request_body = {
      recipient: {
        id: sender_psid,
      },
      message: response,
    };

    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN;

    try {
      const res = await axios(
        `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          data: JSON.stringify(request_body),
        }
      );

      if (res.status !== 200) {
        console.error('Unable to send message:', await res.data);
      } else {
        console.log('Message sent!');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
  async sendMessageToFacebook(sender_psid: string, aiReply: string) {
    const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_TOKEN;
    const imageRegex = /(https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif))/i;
    const match = aiReply.match(imageRegex);

    try {
      if (match) {
        const imageUrl = match[1];
        await axios.post(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
          {
            recipient: { id: sender_psid },
            message: {
              attachment: {
                type: 'image',
                payload: {
                  url: imageUrl,
                  is_reusable: true,
                },
              },
            },
          },
          { headers: { 'Content-Type': 'application/json' } }
        );

        // ⏱️ Gửi text ngay sau đó
        await new Promise((res) => setTimeout(res, 300));

        const textOnly = aiReply
          .replace(/!\[.*?\]\(.*?\)/g, '') // bỏ markdown ảnh
          .replace(imageRegex, '')
          .trim();

        if (textOnly) {
          await axios.post(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
            {
              recipient: { id: sender_psid },
              message: { text: textOnly },
            },
            { headers: { 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // ✅ Không có ảnh → gửi text bình thường
        await axios.post(
          `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
          {
            recipient: { id: sender_psid },
            message: { text: aiReply },
          },
          { headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error: any) {
      console.error(
        '❌ Lỗi khi gửi message đến Facebook:',
        error.response?.data || error.message
      );
    }
  }

  // async sendMessageTelegram(
  //   req: Request,
  //   res: ResponseCustom,
  //   next: NextFunction
  // ) {
  //   try {
  //     const { chatId, message } = req.body;

  //     // Gửi tin nhắn đến người dùng Telegram
  //     await bot.sendMessage(chatId, message);

  //     return res.status(HttpStatusCode.OK).json({
  //       httpStatusCode: HttpStatusCode.OK,
  //       data: 'Message sent to Telegram!',
  //     });
  //   } catch (error) {
  //     console.error('Error sending message to Telegram:', error);
  //     next(error);
  //   }
  // }
  // async WebhookTelegram(req: Request, res: ResponseCustom, next: NextFunction) {
  //   try {
  //     const body = req.body;

  //     if (body.message) {
  //       if (body.message.from?.is_bot) {
  //         return res.status(HttpStatusCode.OK).json({
  //           httpStatusCode: HttpStatusCode.OK,
  //           data: 'IGNORED_BOT_MESSAGE',
  //         });
  //       }

  //       const chatId = body.message.chat.id.toString();
  //       const text = body.message.text;
  //       const firstName = body.message.chat.first_name || 'Unknown';
  //       const lastName = body.message.chat.last_name || '';
  //       const fullName = `${firstName} ${lastName}`.trim();

  //       // 1. Tìm hoặc tạo user mapping với tgid
  //       let user = await User.findOne({ tgid: chatId });
  //       if (!user) {
  //         user = await User.create({
  //           tgid: chatId,
  //           username: fullName || `tg_user_${chatId}`,
  //           email: `${chatId}@telegram.local`,
  //           password: `tg_${uuidv4()}`,
  //         });
  //       }

  //       // 2. Tìm hoặc tạo conversation
  //       let conversation = await Conversation.findOne({
  //         type: 'group',
  //         participants: { $all: [user._id, process.env.BOT_USER_ID] },
  //       });
  //       if (!conversation) {
  //         conversation = await conversationService.createGroupConversation(
  //           user.id.toString(),
  //           process.env.BOT_USER_ID!,
  //           fullName,
  //           'Telegram'
  //         );
  //       }
  //       let content = '';
  //       let type: 'text' | 'image' | 'file' = 'text';
  //       if (body.message.text) {
  //         content = body.message.text;
  //         type = 'text';
  //       } else if (body.message.photo) {
  //         // Lấy ảnh lớn nhất
  //         const photoArr = body.message.photo;
  //         // chọn ảnh có độ phân giải lớn nhất
  //         const largestPhoto = photoArr[photoArr.length - 1];
  //         content = await getTelegramFileUrl(largestPhoto.file_id);
  //         type = 'image';
  //       } else if (body.message.document) {
  //         const fileId = body.message.document.file_id;
  //         content = await getTelegramFileUrl(fileId);
  //         type = 'file';
  //       }

  //       const message = await chatService.SendMessage(
  //         {
  //           conversationId: conversation.id.toString(),
  //           content,
  //           type,
  //         },
  //         user.id.toString()
  //       );

  //       const populatedMessage = await Message.findById(message._id)
  //         .populate('sender', 'username avatar _id')
  //         .lean();

  //       const io = req.app.get('io');
  //       io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
  //       conversation.participants.forEach((p: any) => {
  //         io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
  //       });
  //       if (!conversation.assignedDepartment) {
  //         const messages = await chatService.getRoomChatByConversation(
  //           conversation.id
  //         );
  //         const conversationHistory = messages.map((m: any) => ({
  //           role:
  //             m.sender?._id?.toString() === process.env.BOT_USER_ID
  //               ? 'assistant'
  //               : 'user',
  //           content: [{ type: 'text', text: m.content }],
  //         }));
  //         const limitedHistory = conversationHistory.slice(-10);
  //         const aiReply = await getAIReply(content, undefined, limitedHistory);

  //         const botMessage = await chatService.SendMessage(
  //           {
  //             conversationId: conversation.id.toString(),
  //             content: aiReply,
  //             type: 'text',
  //           },
  //           process.env.BOT_USER_ID!
  //         );
  //         const populatedBotMessage = await Message.findById(botMessage._id)
  //           .populate('sender', 'username avatar _id')
  //           .lean();

  //         io.to(conversation.id.toString()).emit(
  //           'newMessage',
  //           populatedBotMessage
  //         );
  //         await bot.sendMessage(chatId, aiReply);
  //       } else {
  //         console.log(
  //           `[ROUTER] Conversation đã có department=${conversation.assignedDepartment}, bỏ qua AI`
  //         );
  //       }
  //       const intent = await detectIntent(text);
  //       if (intent !== 'other') {
  //         if (
  //           !conversation.assignedDepartment ||
  //           conversation.assignedDepartment !== intent
  //         ) {
  //           const updatedConversation = await conversationService.assignLeader(
  //             conversation.id,
  //             intent
  //           );
  //           console.log(
  //             `[ROUTER] Cập nhật department từ ${
  //               conversation.assignedDepartment || 'none'
  //             } → ${intent}`
  //           );
  //           if (!updatedConversation) {
  //             console.log('[ROUTER] assignLeader trả về null');
  //             return;
  //           }
  //           conversation.assignedDepartment =
  //             updatedConversation.assignedDepartment;
  //           conversation.leader = updatedConversation.leader;
  //           if (updatedConversation.leader) {
  //             io.to(updatedConversation.leader._id.toString()).emit(
  //               'newAssignedConversation',
  //               updatedConversation
  //             );
  //           }
  //         } else {
  //           console.log(`[ROUTER] Department đã là ${intent} → giữ nguyên`);
  //         }
  //       } else {
  //         console.log(
  //           '>>> Current department:',
  //           conversation.assignedDepartment
  //         );
  //       }
  //       // conversation.participants.forEach((p: any) => {
  //       //   io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
  //       // });
  //     }

  //     return res.status(HttpStatusCode.OK).json({
  //       httpStatusCode: HttpStatusCode.OK,
  //       data: 'EVENT_RECEIVED',
  //     });
  //   } catch (error) {
  //     console.error('Error handling Telegram webhook:', error);
  //     next(error);
  //   }
  // }
  // 🧠 Gửi tin nhắn Telegram (cho admin hoặc hệ thống)
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

  // 🧩 Webhook nhận tin từ Telegram
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
            intent
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

  // 🖼️ Gửi tin nhắn có thể chứa ảnh hoặc text đến Telegram
  // async sendMessageToTelegram(chatId: string, aiReply: string) {
  //   const imageRegex = /(https?:\/\/[^\s)]+\.(jpg|jpeg|png|gif))/i;
  //   const match = aiReply.match(imageRegex);

  //   try {
  //     if (match) {
  //       const imageUrl = match[1];
  //       await bot.sendPhoto(chatId, imageUrl);

  //       const textOnly = aiReply
  //         .replace(/!\[.*?\]\(.*?\)/g, '')
  //         .replace(imageRegex, '')
  //         .trim();

  //       if (textOnly) {
  //         await bot.sendMessage(chatId, textOnly);
  //       }
  //     } else {
  //       await bot.sendMessage(chatId, aiReply);
  //     }
  //   } catch (error) {
  //     console.error('❌ Lỗi khi gửi message đến Telegram:', error);
  //   }
  // }

  async registerTelegramWebhook(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const data = await userRouterService.registerTelegramWebhookDirect();
      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data,
      });
    } catch (error) {
      console.error('Error registering Telegram webhook:', error);
      next(error);
    }
  }
}
export default new UserRouterController();
