import Platform from "../../databases/entities/Platform";
import axios from "axios";

class TelegramService{
  //  async registerTelegramWebhookDirect() {
  //   const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  //   const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

  //   const response = await axios.post(
  //     `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
  //     { url: WEBHOOK_URL }
  //   );

  //   if (!response.data.ok) {
  //     throw new Error(
  //       `Failed to register webhook: ${response.data.description}`
  //     );
  //   }
  //   console.log('Telegram Webhook Connect successfully!');
  //   return response.data;
  // }
  async registerTelegramWebhookDirect() {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;
  const setWebhook = await axios.post(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
    { url: WEBHOOK_URL }
  );

  if (!setWebhook.data.ok) {
    throw new Error(
      `Failed to register webhook: ${setWebhook.data.description}`
    );
  }

  const info = await axios.get(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
  );

  if (info.data.result.last_error_message) {
    console.warn(
      `⚠️ Telegram Webhook registered but NOT reachable: ${info.data.result.last_error_message}`
    );
  } else {
    console.log("✅ Telegram Webhook is active and reachable!");
  }
  const platform = await Platform.findOne({ name: "Telegram" });
    if (platform) {
      Object.assign(platform, { status: "connected" });
      await platform.save();
      console.log("📡 Platform status updated to 'connected'");
    } else {
      console.warn("⚠️ Platform 'Telegram' not found in DB");
    }
  return info.data;
}

   async deleteTelegramWebhookDirect() {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`
    );
    const platform = await Platform.findOne({ name: "Telegram" });
    if (platform) {
      Object.assign(platform, { status: "disconnected" });
      await platform.save();
      console.log("📡 Platform status updated to 'disconnected'");
    } else {
      console.warn("⚠️ Platform 'Telegram' not found in DB");
    }
    console.log("Telegram Webhook Disconnect successfully!");
    return response.data;
  }
}
export default new TelegramService();
