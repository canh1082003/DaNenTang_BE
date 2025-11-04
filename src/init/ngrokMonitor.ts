// import FacebookService from '@/modules/Facebook/FacebookService';
// import TelegramService from '@/modules/Telegram/TelegramService';
// import { getIO } from '@/socket';
// import axios from 'axios';
// let wasNgrokAlive = false; // trạng th
// export async function verifyNgrokHealth() {
//   const ngrokUrl = process.env.NGROK_URL;
//   if (!ngrokUrl) {
//     console.warn('⚠️ Missing NGROK_URL in .env');
//     return;
//   }
//   const healthUrl = `${ngrokUrl}/api/v1/health`;
//   try {
//     const res = await axios.get(healthUrl, { timeout: 5000 });
//     if (res.status >= 200 && res.status < 500) {
//       if (!wasNgrokAlive) {
//         console.log(`🟢 Ngrok vừa hoạt động trở lại (${ngrokUrl})`);
//         const io = getIO();
//         // Auto reconnect Telegram & Facebook
//         try {
//           await TelegramService.registerTelegramWebhookDirect();
//           console.log('🔁 Telegram webhook reconnected');
//           // io.emit('platform-status', {
//           //   name: 'Telegram',
//           //   status: 'connected',
//           //   ngrokUrl: process.env.NGROK_URL,
//           // });

//           // console.log('💥 Test emit platform-status sent!');
//         } catch (err) {
//           console.warn('⚠️ Telegram reconnect failed:', err.message);
//         }
//         try {
//           if (FacebookService.ConnectFacebookWebhook) {
//             await FacebookService.ConnectFacebookWebhook();
//             console.log('🔁 Facebook webhook reconnected');

//             // io.emit('platform-status', {
//             //   name: 'Facebook',
//             //   status: 'connected',

//             //   ngrokUrl: process.env.NGROK_URL,
//             // });

//             // console.log('💥 Test emit platform-status sent!');
//           }
//         } catch (err) {
//           console.warn('⚠️ Facebook reconnect failed:', err.message);
//         }
//       } else {
//         console.log(`✅ Ngrok vẫn đang hoạt động (${healthUrl})`);
//       }

//       wasNgrokAlive = true;
//       return;
//     }
//   } catch (error) {
//     console.warn(`🔴 Ngrok có thể đã chết: ${error.message}`);
//     const io = getIO();

//     io.emit('platform-status', {
//       name: 'Telegram',
//       status: 'disconnected',
//       ngrokUrl: process.env.NGROK_URL,
//     });
//     io.emit('platform-status', {
//       name: 'Facebook',
//       status: 'disconnected',
//       ngrokUrl: process.env.NGROK_URL,
//     });
//     console.log('facebook and tele disconnected');
//     if (wasNgrokAlive) {
//       console.log('🧹 Ngắt kết nối webhook vì ngrok vừa chết...');

//       try {
//         await TelegramService.deleteTelegramWebhookDirect();
//         console.log('🧹 Telegram webhook disconnected');
//       } catch (err) {
//         console.warn('❌ Telegram disconnect failed:', err.message);
//       }

//       try {
//         await FacebookService.DisconnectFacebookWebhook();
//         console.log('🧹 Facebook webhook disconnected');
//       } catch (err) {
//         console.warn('❌ Facebook disconnect failed:', err.message);
//       }
//     }

//     wasNgrokAlive = false;
//   }
// }
import TelegramService from "@/modules/Telegram/TelegramService";
import FacebookService from "@/modules/Facebook/FacebookService";
import axios from "axios";
import { getIO } from "@/socket";
export const platformState = {
  Facebook: "disconnected",
  Telegram: "disconnected",
};
export async function verifyNgrokHealth() {
  const io = getIO();
  const ngrokUrl = process.env.NGROK_URL;

  try {
    const res = await axios.get(`${ngrokUrl}/api/v1/health`, { timeout: 5000 });

    if (res.status >= 200 && res.status < 500) {
      console.log(`🟢 Ngrok OK (${ngrokUrl})`);

      // Nếu Telegram trước đó disconnected → reconnect
      if (process.env.AUTO_RECONNECT === "true" && platformState.Telegram === "disconnected") {
        await TelegramService.registerTelegramWebhookDirect();
        platformState.Telegram = "connected";
        io.emit("platform-status", {
          name: "Telegram",
          status: "connected",
          ngrokUrl,
        });
        console.log("💥 Emit platform-status Telegram CONNECTED");
      }

      // Nếu Facebook trước đó disconnected → reconnect
      if (process.env.AUTO_RECONNECT === "true" && platformState.Facebook === "disconnected") {
        await FacebookService.ConnectFacebookWebhook();
        platformState.Facebook = "connected";
        io.emit("platform-status", {
          name: "Facebook",
          status: "connected",
          ngrokUrl,
        });
        console.log("💥 Emit platform-status Facebook CONNECTED");
      }
    }
  } catch (err: any) {
    console.warn(`🔴 Ngrok có thể đã chết: ${err.message}`);

    // Nếu ngrok chết → disconnect cả 2
    if (
      platformState.Telegram === "connected" ||
      platformState.Facebook === "connected"
    ) {
      console.log("🧹 Ngắt kết nối webhook vì ngrok vừa chết...");

      if ( platformState.Telegram === "connected") {
        await TelegramService.deleteTelegramWebhookDirect();
        platformState.Telegram = "disconnected";
        io.emit("platform-status", { name: "Telegram", status: "disconnected" });
      }

      if ( platformState.Facebook === "connected") {
        await FacebookService.DisconnectFacebookWebhook();
        platformState.Facebook = "disconnected";
        io.emit("platform-status", { name: "Facebook", status: "disconnected" });
      }
    }
  }
}
// import axios from "axios";
// import { getIO } from "@/socket";
// import TelegramService from "@/modules/Telegram/TelegramService";
// import FacebookService from "@/modules/Facebook/FacebookService";
// import { updatePlatformState } from "./platformStateManager";

// export async function verifyNgrokHealth() {
//   const io = getIO();
//   const ngrokUrl = process.env.NGROK_URL;
//   const AUTO_RECONNECT = process.env.AUTO_RECONNECT === "true";

//   try {
//     const res = await axios.get(`${ngrokUrl}/api/v1/health`, { timeout: 5000 });

//     if (res.status >= 200 && res.status < 500) {
//       // 🟢 Ngrok OK
//       if (!AUTO_RECONNECT) {
//         console.log("⏸️ AUTO_RECONNECT=false → skip auto reconnect");
//         return;
//       }

//       // Nếu bị disconnect do ngrok chết, thì reconnect lại
//       if (platformState.Telegram === "disconnected") {
//         await TelegramService.registerTelegramWebhookDirect();
//         updatePlatformState("Telegram", "connected", io);
//       }
//       if (platformState.Facebook === "disconnected") {
//         await FacebookService.ConnectFacebookWebhook();
//         updatePlatformState("Facebook", "connected", io);
//       }
//     }
//   } catch (err: any) {
//     // 🔴 Ngrok chết
//     console.warn("🔴 Ngrok health check failed:", err.message);
//     await handleNgrokDown(io);
//   }
// }

// async function handleNgrokDown(io) {
//   try {
//     if (platformState.Telegram === "connected") {
//       await TelegramService.deleteTelegramWebhookDirect();
//       updatePlatformState("Telegram", "disconnected", io);
//     }
//     if (platformState.Facebook === "connected") {
//       await FacebookService.DisconnectFacebookWebhook();
//       updatePlatformState("Facebook", "disconnected", io);
//     }
//   } catch (error) {
//     console.error("❌ Error during ngrok shutdown:", error.message);
//   }
// }
