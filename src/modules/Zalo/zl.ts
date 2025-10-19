// import { Zalo } from 'zca-js';
// import express, { Application, Request, Response } from 'express';
// import dotenv from 'dotenv';
// import User from '@/databases/entities/User';
// import Conversation from '@/databases/entities/Conversation';
// import Message from '@/databases/entities/Message';
// import chatService from '../Chat/chatService';

// dotenv.config();

// /**
//  * Zalo Bot (v2.0.4) — Gửi tin nhắn + mô phỏng inbound
//  */
// export const initZaloBot = async (io?: any) => {
//   const app: Application = express();
//   app.use(express.json());

//   const account = process.env.ZALO_PHONE || '000';
//   const password = process.env.ZALO_PASSWORD;

//   if (!account || !password) {
//     console.error('❌ Thiếu ZALO_PHONE hoặc ZALO_PASSWORD trong .env');
//     return;
//   }

//   const zalo = new Zalo();

//   console.log('🔐 Đang đăng nhập Zalo...');

//   try {
//     const api = await zalo.login({ account, password });

//     console.log('✅ Đăng nhập thành công!');
//     if (io) io.emit('zalo_status', { status: 'ready' });

//     // ======================================
//     // 📨 API GỬI TIN NHẮN
//     // ======================================
//     app.post('/api/zalo/send', async (req: Request, res: Response) => {
//       const { userId, text } = req.body;
//       if (!userId || !text) {
//         return res.status(400).json({ error: 'Thiếu userId hoặc text' });
//       }

//       try {
//         await api.message.sendText(userId, text);
//         res.json({ success: true });
//       } catch (err) {
//         console.error('❌ Lỗi gửi tin:', err);
//         res.status(500).json({ error: String(err) });
//       }
//     });

//     // ======================================
//     // 📥 MÔ PHỎNG NHẬN TIN NHẮN INBOUND (webhook)
//     // ======================================
//     app.post('/api/zalo/inbound', async (req: Request, res: Response) => {
//       try {
//         const { senderId, text } = req.body;
//         if (!senderId || !text) {
//           return res.status(400).json({ error: 'Thiếu senderId hoặc text' });
//         }

//         console.log('📩 [Inbound] Tin nhắn mới:', text, 'từ', senderId);

//         // 1️⃣ Tìm hoặc tạo user
//         let user = await User.findOne({ zaloId: senderId });
//         if (!user) {
//           user = await User.create({
//             zaloId: senderId,
//             username: `zalo_${senderId}`,
//             email: `${senderId}@zalo.local`,
//             password: `zalo_${Date.now()}`,
//           });
//         }

//         // 2️⃣ Tìm hoặc tạo conversation
//         let conversation = await Conversation.findOne({
//           type: 'group',
//           participants: { $all: [user._id, process.env.BOT_USER_ID] },
//         });

//         if (!conversation) {
//           conversation = await Conversation.create({
//             type: 'group',
//             participants: [user._id, process.env.BOT_USER_ID],
//           });
//         }

//         // 3️⃣ Lưu message
//         const message = await chatService.SendMessage(
//           {
//             conversationId: conversation.id.toString(),
//             content: text,
//             type: 'text',
//           },
//           user.id.toString()
//         );

//         const populatedMessage = await Message.findById(message._id)
//           .populate('sender', 'username avatar _id')
//           .lean();

//         // 4️⃣ Push ra socket realtime
//         io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
//         conversation.participants.forEach((p: any) => {
//           io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
//         });

//         res.json({ success: true });
//       } catch (err) {
//         console.error('❌ Lỗi inbound message:', err);
//         res.status(500).json({ error: String(err) });
//       }
//     });

//     // ======================================
//     console.log('🤖 Zalo Bot (v2.0.4) sẵn sàng!');
//   } catch (err) {
//     console.error('❌ Đăng nhập Zalo thất bại:', err);
//   }
// };
