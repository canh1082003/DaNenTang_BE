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
            console.log('Webhook event:', webhookEvent);

            const sender_psid = webhookEvent.sender.id;
            console.log('Sender PSID:', sender_psid);
            const page = process.env.FB_PAGE_TOKEN as string;

            if (webhookEvent.message) {
              const userProfile = await getUserName(sender_psid, page);
              console.log(userProfile.first_name);
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
  async sendMessage(sender_psid: string, reply: string) {
    const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
    console.log(sender_psid);
    await axios.post(
      `https://graph.facebook.com/v19.0/me/messages?access_token=${FB_PAGE_TOKEN}`,
      {
        recipient: { id: sender_psid },
        message: { text: reply },
      }
    );
    console.log('Message sent!');
  }
  async handleMessage(
    sender_psid: string,
    received_message: any,
    req: Request & { user?: { id: string; token?: string } },
    displayName?: string
  ) {
    // 1. Tìm hoặc tạo user mapping với psid
    let user = await User.findOne({ psid: sender_psid });
    if (!user) {
      user = await User.create({
        psid: sender_psid,
        username: displayName || `fb_user_${sender_psid}`,
        email: `${sender_psid}@messenger.local`,
        password: `fb_${uuidv4()}`,
      });
    }
    const userProfile = await getUserName(
      sender_psid,
      process.env.FB_PAGE_TOKEN!
    );
    const fullName = `${userProfile.first_name} ${userProfile.last_name}`;
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

    // 3. Lưu message user gửi
    const message = await chatService.SendMessage(
      {
        conversationId: conversation.id.toString(),
        content: received_message.text,
        type: 'text',
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
  async sendMessageTelegram(
    req: Request,
    res: ResponseCustom,
    next: NextFunction
  ) {
    try {
      const { chatId, message } = req.body;

      // Gửi tin nhắn đến người dùng Telegram
      await bot.sendMessage(chatId, message);

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'Message sent to Telegram!',
      });
    } catch (error) {
      console.error('Error sending message to Telegram:', error);
      next(error);
    }
  }
  async WebhookTelegram(req: Request, res: ResponseCustom, next: NextFunction) {
    try {
      const body = req.body;

      if (body.message) {
        if (body.message.from?.is_bot) {
          return res.status(HttpStatusCode.OK).json({
            httpStatusCode: HttpStatusCode.OK,
            data: 'IGNORED_BOT_MESSAGE',
          });
        }

        const chatId = body.message.chat.id.toString();
        const text = body.message.text;
        const firstName = body.message.chat.first_name || 'Unknown';
        const lastName = body.message.chat.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();

        // 1. Tìm hoặc tạo user mapping với tgid
        let user = await User.findOne({ tgid: chatId });
        if (!user) {
          user = await User.create({
            tgid: chatId,
            username: fullName || `tg_user_${chatId}`,
            email: `${chatId}@telegram.local`,
            password: `tg_${uuidv4()}`,
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
            'Telegram'
          );
        }
        let content = '';
        let type: 'text' | 'image' | 'file' = 'text';
        console.log(body.message);
        if (body.message.text) {
          content = body.message.text;
          type = 'text';
        } else if (body.message.photo) {
          // Lấy ảnh lớn nhất
          const photoArr = body.message.photo;
          // chọn ảnh có độ phân giải lớn nhất
          const largestPhoto = photoArr[photoArr.length - 1];
          content = await getTelegramFileUrl(largestPhoto.file_id);
          type = 'image';
        } else if (body.message.document) {
          const fileId = body.message.document.file_id;
          content = await getTelegramFileUrl(fileId);
          type = 'file';
        }

        const message = await chatService.SendMessage(
          {
            conversationId: conversation.id.toString(),
            content,
            type,
          },
          user.id.toString()
        );

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar _id')
          .lean();

        // 4. Đẩy qua socket cho web
        const io = req.app.get('io');
        io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
        conversation.participants.forEach((p: any) => {
          io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
        });
        if (!conversation.assignedDepartment) {
          const aiReply = await getAIReply(text);
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
          await bot.sendMessage(chatId, aiReply);
        } else {
          console.log(
            `[ROUTER] Conversation đã có department=${conversation.assignedDepartment}, bỏ qua AI`
          );
        }
        const intent = await detectIntent(text);
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
            conversation.assignedDepartment =
              updatedConversation.assignedDepartment;
            conversation.leader = updatedConversation.leader;
            if (updatedConversation.leader) {
              io.to(updatedConversation.leader._id.toString()).emit(
                'newAssignedConversation',
                updatedConversation
              );
            }
          } else {
            console.log(`[ROUTER] Department đã là ${intent} → giữ nguyên`);
          }
        } else {
          console.log(
            '>>> Current department:',
            conversation.assignedDepartment
          );
        }
        // conversation.participants.forEach((p: any) => {
        //   io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
        // });
      }

      return res.status(HttpStatusCode.OK).json({
        httpStatusCode: HttpStatusCode.OK,
        data: 'EVENT_RECEIVED',
      });
    } catch (error) {
      console.error('Error handling Telegram webhook:', error);
      next(error);
    }
  }

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
