import FacebookService from '@/modules/Facebook/FacebookService';
import TelegramService from '@/modules/Telegram/TelegramService';
import { getIO } from '@/socket';
import axios from 'axios';
let wasNgrokAlive = false; // trạng th
export async function verifyNgrokHealth() {
  const ngrokUrl = process.env.NGROK_URL;
  if (!ngrokUrl) {
    console.warn('⚠️ Missing NGROK_URL in .env');
    return;
  }
  const healthUrl = `${ngrokUrl}/api/v1/health`;
  try {
    const res = await axios.get(healthUrl, { timeout: 5000 });
    if (res.status >= 200 && res.status < 500) {
      if (!wasNgrokAlive) {
        console.log(`🟢 Ngrok vừa hoạt động trở lại (${ngrokUrl})`);
        const io = getIO();
        // Auto reconnect Telegram & Facebook
        try {
          await TelegramService.registerTelegramWebhookDirect();
          console.log('🔁 Telegram webhook reconnected');
          io.emit('platform-status', { name: 'Telegram', status: 'connected' });

          console.log('💥 Test emit platform-status sent!');
        } catch (err) {
          console.warn('⚠️ Telegram reconnect failed:', err.message);
        }

        try {
          // Gọi hàm đăng ký lại webhook Facebook nếu bạn có
          if (FacebookService.ConnectFacebookWebhook) {
            await FacebookService.ConnectFacebookWebhook();
            console.log('🔁 Facebook webhook reconnected');

            io.emit('platform-status', {
              name: 'Facebook',
              status: 'connected',
            });

            console.log('💥 Test emit platform-status sent!');
          }
        } catch (err) {
          console.warn('⚠️ Facebook reconnect failed:', err.message);
        }
      } else {
        console.log(`✅ Ngrok vẫn đang hoạt động (${healthUrl})`);
      }

      wasNgrokAlive = true;
      return;
    }
  } catch (error) {
    console.warn(`🔴 Ngrok có thể đã chết: ${error.message}`);

    if (wasNgrokAlive) {
      console.log('🧹 Ngắt kết nối webhook vì ngrok vừa chết...');

      try {
        await TelegramService.deleteTelegramWebhookDirect();
        console.log('🧹 Telegram webhook disconnected');
      } catch (err) {
        console.warn('❌ Telegram disconnect failed:', err.message);
      }

      try {
        await FacebookService.DisconnectFacebookWebhook();
        console.log('🧹 Facebook webhook disconnected');
      } catch (err) {
        console.warn('❌ Facebook disconnect failed:', err.message);
      }
    }

    wasNgrokAlive = false;
  }
}
