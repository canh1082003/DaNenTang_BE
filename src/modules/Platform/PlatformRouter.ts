// import { Router } from "express";
// import { getIO } from "@/socket";
// import FacebookService from "@/modules/Facebook/FacebookService";
// import TelegramService from "@/modules/Telegram/TelegramService";
// import { updatePlatformState } from "@/init/platformStateManager";

// const PlatformRouter = Router();

// // /api/v1/platform/connect/Facebook
// PlatformRouter.post("/connect/:platform", async (req, res) => {
//   const io = getIO();
//   const { platform } = req.params;
//   try {
//     switch (platform.toLowerCase()) {
//       case "facebook":
//         await FacebookService.ConnectFacebookWebhook();
//         updatePlatformState("Facebook", "connected", io);
//         break;
//       case "telegram":
//         await TelegramService.registerTelegramWebhookDirect();
//         updatePlatformState("Telegram", "connected", io);
//         break;
//       default:
//         return res.status(400).json({ error: "Unsupported platform" });
//     }
//     return res.json({ success: true, status: "connected" });
//   } catch (error: any) {
//     console.error(`❌ Connect ${platform} failed:`, error.message);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// });

// PlatformRouter.post("/disconnect/:platform", async (req, res) => {
//   const io = getIO();
//   const { platform } = req.params;
//   try {
//     switch (platform.toLowerCase()) {
//       case "facebook":
//         await FacebookService.DisconnectFacebookWebhook();
//         updatePlatformState("Facebook", "disconnected", io);
//         break;
//       case "telegram":
//         await TelegramService.deleteTelegramWebhookDirect();
//         updatePlatformState("Telegram", "disconnected", io);
//         break;
//       default:
//         return res.status(400).json({ error: "Unsupported platform" });
//     }
//     return res.json({ success: true, status: "disconnected" });
//   } catch (error: any) {
//     console.error(`❌ Disconnect ${platform} failed:`, error.message);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// });

// export default PlatformRouter;
