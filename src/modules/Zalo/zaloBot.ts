// import { createPatchedZalo, restoreCookieJar } from './patchedZalo';
// import fs from 'fs';
// import path from 'path';
// import User from '@/databases/entities/User';
// import Conversation from '@/databases/entities/Conversation';
// import Message from '@/databases/entities/Message';
// import chatService from '../Chat/chatService';
// import { LoginQRCallbackEventType } from 'zca-js';

// const SESSION_FILE = path.join(__dirname, 'zalo-session.json');

// export async function initZaloBot(io: any) {
//   const zalo = createPatchedZalo({ selfListen: false, logging: true });
//   let api;

//   try {
//     if (fs.existsSync(SESSION_FILE)) {
//       // ✅ Khôi phục cookies từ file
//       const serialized = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
//       const jar = restoreCookieJar(serialized.cookie || serialized);

//       api = await zalo.loginCookie(jar);
//       // api = zalo;
//       console.log(
//         '✅ Zalo auto-login bằng session:',
//         zalo.getOwnId?.() || 'No getOwnId'
//       );
//     } else {
//       // 🔄 Nếu chưa có session thì login bằng QR
//       api = await loginWithQR(zalo, io);
//       const serialized = zalo.ctx.cookie.serializeSync();
//       fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));
//       console.log('💾 Đã lưu cookie vào zalo-session.json');

//       // api = zalo;
//     }

//     if (zalo.listener && typeof zalo.listener.on === 'function') {
//       console.log('🌀 Bắt đầu startListen() (fallback cho v2.x)...');
//       zalo.startListen('message', async (event: any) => {
//         console.log('📩 Zalo message:', event);
//         console.log('📩 [startListen] Zalo message:', event);
//         const senderId = event.senderId;
//         const text = event.message?.text;

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

//         // 4️⃣ Push ra socket
//         io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
//         conversation.participants.forEach((p: any) => {
//           io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
//         });
//       });

//       console.log('🔊 Zalo listener attached (v2.x)');
//     } else {
//       console.warn('⚠️ Zalo listener chưa sẵn sàng (v2.x)');
//     }

//     return zalo;
//   } catch (error) {
//     console.error('❌ Zalo login failed:', error);

//     // Fallback sang login QR nếu cookies lỗi/hết hạn
//     return await loginWithQR(zalo, io);
//   }
// }

// // Hàm login bằng QR (fallback)
// async function loginWithQR(zalo: any, io: any) {
//   return new Promise((resolve, reject) => {
//     zalo
//       .loginQR({}, async (event) => {
//         if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
//           const qrData = event.data as { image: string };
//           const base64Image = qrData.image.replace(
//             /^data:image\/png;base64,/,
//             ''
//           );
//           fs.writeFileSync('zalo-qr.png', base64Image, 'base64');
//           io.emit('zalo-qr', `data:image/png;base64,${base64Image}`);
//           console.log('📲 QR code đã lưu vào zalo-qr.png, quét bằng app Zalo');
//         }
//       })
//       .then(async (api: any) => {
//         try {
//           // ✅ Lưu cookies sau login thành công
//           // const serialized = api.ctx.cookie.serializeSync();
//           const serialized = {
//             cookie: api.ctx.cookie.serializeSync(),
//             user: api.ctx.user || { id: api.ctx.uin },
//           };
//           fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));

//           fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));
//           // console.log('👉 CookieJar:', zalo.ctx?.cookie?.toJSON());
//           console.log('💾 Đã lưu cookie vào zalo-session.json');
//           resolve(api);
//         } catch (e) {
//           console.error('❌ Failed to save cookies:', e);
//           reject(e);
//         }
//       })
//       .catch((err: any) => {
//         reject(err);
//       });
//   });
// }
