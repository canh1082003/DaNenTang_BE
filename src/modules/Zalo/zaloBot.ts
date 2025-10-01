// // src/init/zaloBot.ts

// // 🔥 IMPORTANT: Import patchedZalo FIRST to apply patches before zca-js loads
// import { createPatchedZalo } from './patchedZalo';

// // Now import other dependencies
// import { LoginQRCallbackEventType } from 'zca-js';
// import fs from 'fs';
// import path from 'path';
// import User from '@/databases/entities/User';
// import Conversation from '@/databases/entities/Conversation';
// import Message from '@/databases/entities/Message';
// import chatService from '../Chat/chatService';

// const SESSION_FILE = path.join(__dirname, 'zalo-session.json');

// export async function initZaloBot(io: any) {
//   const zalo = createPatchedZalo({ selfListen: false, logging: true });
//   let api;

//   try {
//     if (fs.existsSync(SESSION_FILE)) {
//       const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
//       api = await zalo.loginCookie(cookies);
//       console.log('✅ Zalo auto-login bằng session:', api.getOwnId());
//     } else {
//       // 🔹 Nếu chưa có session thì login bằng QR
//       api = await zalo.loginQR({}, (event) => {
//         if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
//           const qrData = event.data as { image: string };
//           const base64Image = qrData.image.replace(
//             /^data:image\/png;base64,/,
//             ''
//           );

//           fs.writeFileSync('zalo-qr.png', base64Image, 'base64');
//           io.emit('zalo-qr', `data:image/png;base64,${base64Image}`);

//           console.log(
//             '📲 QR code đã lưu vào zalo-qr.png, mở file và quét bằng app Zalo'
//           );
//         }
//       });

//       // Save cookies after successful login
//       try {
//         const cookies = zalo.getCookies();
//         fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
//         console.log('💾 Đã lưu cookie vào zalo-session.json');
//       } catch (e) {
//         console.error('❌ Failed to save cookies:', e);
//       }
//     }

//     console.log('✅ Zalo login thành công:', api.getOwnId());

//     // Nghe tin nhắn đến
//     (api.listener as any).on('message', async (event: any) => {
//       try {
//         console.log('Zalo message:', event);
//         const senderId = event.senderId;
//         const text = event.message?.text;

//         // 1. Tìm hoặc tạo user
//         let user = await User.findOne({ zaloId: senderId });
//         if (!user) {
//           user = await User.create({
//             zaloId: senderId,
//             username: `zalo_${senderId}`,
//             email: `${senderId}@zalo.local`,
//             password: `zalo_${Date.now()}`,
//           });
//         }

//         // 2. Tìm hoặc tạo conversation
//         let conversation = await Conversation.findOne({
//           type: 'private',
//           participants: { $all: [user._id, process.env.BOT_USER_ID] },
//         });

//         if (!conversation) {
//           conversation = await Conversation.create({
//             type: 'private',
//             participants: [user._id, process.env.BOT_USER_ID],
//           });
//         }

//         // 3. Lưu message
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

//         // 4. Đẩy ra socket
//         io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
//         conversation.participants.forEach((p: any) => {
//           io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
//         });
//       } catch (error) {
//         console.error('❌ Error handling Zalo message:', error);
//       }
//     });

//     return api;
//   } catch (error) {
//     console.error('❌ Zalo login failed:', error);
//     throw error;
//   }
// }

// src/modules/Zalo/zaloBot.ts

// Import patchedZalo FIRST
import { createPatchedZalo, restoreCookieJar } from './patchedZalo';
import fs from 'fs';
import path from 'path';
import User from '@/databases/entities/User';
import Conversation from '@/databases/entities/Conversation';
import Message from '@/databases/entities/Message';
import chatService from '../Chat/chatService';
import { LoginQRCallbackEventType } from 'zca-js';

const SESSION_FILE = path.join(__dirname, 'zalo-session.json');

export async function initZaloBot(io: any) {
  const zalo = createPatchedZalo({ selfListen: false, logging: true });
  let api;

  try {
    if (fs.existsSync(SESSION_FILE)) {
      //   const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      //   api = await zalo.loginCookie(restoreCookieJar(cookies));
      const serialized = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
      const jar = restoreCookieJar(serialized);
      zalo.ctx = zalo.ctx || {};
      zalo.ctx.cookie = jar;
      api = await zalo.loginCookie();

      console.log('✅ Zalo auto-login bằng session:', api.getOwnId());
    } else {
      // Login bằng QR
      api = await zalo.loginQR({}, (event) => {
        if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
          const qrData = event.data as { image: string };
          const base64Image = qrData.image.replace(
            /^data:image\/png;base64,/,
            ''
          );
          fs.writeFileSync('zalo-qr.png', base64Image, 'base64');
          io.emit('zalo-qr', `data:image/png;base64,${base64Image}`);
          console.log('📲 QR code đã lưu vào zalo-qr.png, quét bằng app Zalo');
        }
      });

      // Lưu cookies sau login
      try {
        // const cookies = zalo.getCookies();
        // fs.writeFileSync(SESSION_FILE, JSON.stringify(cookies, null, 2));
        const serialized = await zalo.ctx.cookie.serializeSync();
        fs.writeFileSync(SESSION_FILE, JSON.stringify(serialized, null, 2));
        console.log('💾 Đã lưu cookie vào zalo-session.json');
      } catch (e) {
        console.error('❌ Failed to save cookies:', e);
      }
    }

    console.log('✅ Zalo login thành công:', api.getOwnId());

    // Nghe tin nhắn đến
    (api.listener as any).on('message', async (event: any) => {
      try {
        console.log('Zalo message:', event);
        const senderId = event.senderId;
        const text = event.message?.text;

        // 1. Tìm hoặc tạo user
        let user = await User.findOne({ zaloId: senderId });
        if (!user) {
          user = await User.create({
            zaloId: senderId,
            username: `zalo_${senderId}`,
            email: `${senderId}@zalo.local`,
            password: `zalo_${Date.now()}`,
          });
        }

        // 2. Tìm hoặc tạo conversation
        let conversation = await Conversation.findOne({
          type: 'private',
          participants: { $all: [user._id, process.env.BOT_USER_ID] },
        });

        if (!conversation) {
          conversation = await Conversation.create({
            type: 'private',
            participants: [user._id, process.env.BOT_USER_ID],
          });
        }

        // 3. Lưu message
        const message = await chatService.SendMessage(
          {
            conversationId: conversation.id.toString(),
            content: text,
            type: 'text',
          },
          user.id.toString()
        );

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username avatar _id')
          .lean();

        // 4. Đẩy ra socket
        io.to(conversation.id.toString()).emit('newMessage', populatedMessage);
        conversation.participants.forEach((p: any) => {
          io.to(p._id.toString()).emit('newMessagePreview', populatedMessage);
        });
      } catch (error) {
        console.error('❌ Error handling Zalo message:', error);
      }
    });

    return api;
  } catch (error) {
    console.error('❌ Zalo login failed:', error);
    throw error;
  }
}
