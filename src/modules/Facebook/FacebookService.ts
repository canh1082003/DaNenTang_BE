import Platform from '../../databases/entities/Platform';
import User from '../../databases/entities/User';
import { generateEmail } from '../../hook/generateEmail';
import { Hashing } from '../../utils/hashing';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
class FacebookService {
  async findOrCreateMessengerUser(
    sender_psid: string,
    name: string,
    profilePic?: string
  ) {
    const email = generateEmail(sender_psid, name);

    let user = await User.findOne({ email });

    if (!user) {
      // tạo mật khẩu ngẫu nhiên để hash
      const randomPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await Hashing.toHash(randomPassword);

      user = new User({
        username: name,
        email,
        password: hashedPassword,
        role: 'user',
        isVerifyEmail: true, // auto verify vì không gửi email
        profilePic,
      });
      await user.save();
      console.log('✅ Registered messenger user:', email);
    } else {
      // console.log('🔑 Found messenger user:', email);
    }

    // tạo JWT
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return { user, token };
  }
  async ConnectFacebookWebhook() {
    const APP_ID = process.env.APP_ID_FACEBOOK;
    const APP_SECRET = process.env.APP_Serect_FACEBOOK;
    const VERIFY_TOKEN = process.env.MY_VERIFY_FB_TOKEN;
    const NGROK_URL = process.env.NGROK_URL;

    if (!APP_ID || !APP_SECRET || !NGROK_URL || !VERIFY_TOKEN) {
      throw new Error('Missing Facebook environment variables!');
    }

    const APP_ACCESS_TOKEN = `${APP_ID}|${APP_SECRET}`;
    const WEBHOOK_URL = `${NGROK_URL}/api/v1/facebook/webhook`;

    // Gọi Graph API để đăng ký webhook
    const response = await axios.post(
      `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions`,
      {
        object: 'page',
        callback_url: WEBHOOK_URL,
        fields: 'messages,messaging_postbacks,messaging_optins',
        verify_token: VERIFY_TOKEN,
        include_values: true,
      },
      {
        params: {
          access_token: APP_ACCESS_TOKEN,
        },
      }
    );

    if (!response.data.success) {
      throw new Error(
        `Failed to register Facebook webhook: ${JSON.stringify(response.data)}`
      );
    }

    const platform = await Platform.findOne({ name: 'Facebook' });
    console.log(platform);
    if (platform) {
      Object.assign(platform, {
        status: 'connected',
        connectedAt: new Date(),
        disconnectedAt: null,
      });
      await platform.save();
    }
    console.log('✅ Facebook Webhook Connect successfully!');

    return response.data;
  }
  async DisconnectFacebookWebhook() {
    const APP_ID = process.env.APP_ID_FACEBOOK;
    const APP_SECRET = process.env.APP_Serect_FACEBOOK;

    if (!APP_ID || !APP_SECRET) {
      throw new Error('Missing Facebook app credentials!');
    }

    const APP_ACCESS_TOKEN = `${APP_ID}|${APP_SECRET}`;
    const response = await axios.delete(
      `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions?access_token=${APP_ACCESS_TOKEN}`
    );

    console.log('🧹 Facebook Webhook Disconnect successfully!');
    const platform = await Platform.findOne({ name: 'Facebook' });
    if (platform) {
      Object.assign(platform, { status: 'disconnected' });
      await platform.save();
      console.log("📡 Platform status updated to 'disconnected'");
    }

    return response.data;
  }
}
export default new FacebookService();
