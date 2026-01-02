import BadRequestException from '../../common/exception/BadRequestException';
import { detectIntent, getAIReply, getUserName } from '../../hook/AIReply';
import { AuthenticatedRequest } from '../../hook/AuthenticatedRequest';
import AuthErrorCode from '../../utils/AuthErrorCode';
import { ResponseCustom } from '../../utils/expressCustom';
import { HttpStatusCode } from '../../utils/httpStatusCode';
import { NextFunction, Request , Response } from 'express';
import { validationResult } from 'express-validator';
import FacebookService from './FacebookService';
import axios from 'axios';
import User from '../../databases/entities/User';
import Conversation from '../../databases/entities/Conversation';
import conversationService from '../conversation/conversationService';
import chatService from '../Chat/chatService';
import Message from '../../databases/entities/Message';
import { v4 as uuidv4 } from 'uuid';
import { AI_INTENTS, STAFF_DEPARTMENTS } from './type';

class FacebookRouterController {
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
                await FacebookService.findOrCreateMessengerUser(
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

      console.log('Message sent!');
      return res.data;
    } catch (error: any) {
      console.error(
        'Error sending message:',
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
      console.error('Empty content received');
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
// io.emit("newMessagePreview", populatedMessage);

    const intent = await detectIntent(content);

// TH1: AI được phép trả lời (chưa có department hoặc intent thuần AI)
if (
  !conversation.assignedDepartment &&
  (AI_INTENTS.includes(intent) || intent === 'other' || !intent)
) {
  console.log(
    `[ROUTER] AI sẽ trả lời vì department=${conversation.assignedDepartment} & intent=${intent}`
  );

  const messages = await chatService.getRoomChatByConversation(conversation.id);
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
  io.to(conversation.id.toString()).emit('newMessagePreview', populatedBotMessage);

  console.log('🤖 AI đã trả lời cho người dùng Facebook:', sender_psid);

  // Nếu intent là "xem/mua hàng" thì KHÔNG gán department, dừng tại đây
  if (intent === 'buy_product' || intent === 'view_product') {
    console.log(`[ROUTER] Intent ${intent} → bỏ qua assign department`);
    return;
  }

  return; // ✅ kết thúc flow AI
}

// H2: intent/staff department (AI KHÔNG được trả lời)
  if (
  STAFF_DEPARTMENTS.includes(intent || '') ||
  STAFF_DEPARTMENTS.includes(conversation.assignedDepartment || '')
) {
  console.log(`[ROUTER] AI KHÔNG trả lời vì intent=${intent} hoặc department=${conversation.assignedDepartment}`);

  // Nếu chưa gán hoặc department khác intent → cập nhật
  if (!conversation.assignedDepartment || conversation.assignedDepartment !== intent) {
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
    conversation.assignedDepartment = updatedConversation.assignedDepartment;
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

  return; // ✅ kết thúc flow staff
}

// 🧩 TH3: Các intent khác → AI tiếp tục trả lời bình thường
console.log(`[ROUTER] Intent ${intent} không nằm trong STAFF_DEPARTMENTS → AI trả lời`);

const messages = await chatService.getRoomChatByConversation(conversation.id);
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
io.to(conversation.id.toString()).emit('newMessagePreview', populatedBotMessage);
console.log('🤖 AI đã trả lời cho người dùng Facebook:', sender_psid);

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
          .replace(/!\[.*?\]\(.*?\)/g, '')
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
        'Lỗi khi gửi message đến Facebook:',
        error.response?.data || error.message
      );
    }
  }
  // async ConnectFacebook(req, res) {
  //   try {
  //     const APP_ID_FACEBOOK = process.env.APP_ID_FACEBOOK!;
  //     const APP_Serect_FACEBOOK = process.env.APP_Serect_FACEBOOK!;
  //     const MY_VERIFY_FB_TOKEN = process.env.MY_VERIFY_FB_TOKEN!;
  //     const NGROK_URL = process.env.NGROK_URL!;
  //     const callbackUrl = `${NGROK_URL}/api/v1/facebook/webhook`;

  //     const response = await axios.post(
  //       `https://graph.facebook.com/v21.0/${APP_ID_FACEBOOK}/subscriptions`,
  //       {
  //         object: 'page',
  //         callback_url: callbackUrl,
  //         fields: 'messages,messaging_postbacks',
  //         verify_token: MY_VERIFY_FB_TOKEN,
  //         access_token: `${APP_ID_FACEBOOK}|${APP_Serect_FACEBOOK}`,
  //       }
  //     );
  //     console.log('Connected Facebook:', response.data);
  //     return res.json({ success: true, data: response.data });
  //   } catch (error: any) {
  //     console.error('Connect Facebook error:', error.response?.data || error.message);
  //     return res
  //       .status(500)
  //       .json({ error: error.response?.data || error.message });
  //   }
  // }
  // async DisconnectFacebook(req, res) {
  //   try {
  //     const APP_ID = process.env.APP_ID_FACEBOOK!;
  //     const APP_SECRET = process.env.APP_Serect_FACEBOOK!;

  //     const APP_ACCESS_TOKEN = `${APP_ID}|${APP_SECRET}`;
  //     const response = await axios.delete(
  //       `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?access_token=${APP_ACCESS_TOKEN}`
  //     );

  //     console.log('Disconnected:', response.data);
  //     return res.json({ success: true });
  //   } catch (error: any) {
  //     console.error(
  //       'Disconnect error:',
  //       error.response?.data || error.message
  //     );
  //     return res
  //       .status(500)
  //       .json({ error: error.response?.data || error.message });
  //   }
  // }
  async ConnectFacebookWebhook(req, res, next) {
    try {
      const data = await FacebookService.ConnectFacebookWebhook();
      return res.status(200).json({
        httpStatusCode: 200,
        data,
      });
    } catch (error) {
      console.error("❌ Error registering Facebook webhook:", error);
      next(error);
    }
  }

  async DisconnectFacebookWebhook(req, res, next) {
    try {
      const data = await FacebookService.DisconnectFacebookWebhook();
      return res.status(200).json({
        httpStatusCode: 200,
        data,
      });
    } catch (error) {
      console.error("❌ Error deleting Facebook webhook:", error);
      next(error);
    }
  }
}

export default new FacebookRouterController();
