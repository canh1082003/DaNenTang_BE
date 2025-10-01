import BadRequestException from '@/common/exception/BadRequestException';
import User from '@/databases/entities/User';
import AuthErrorCode from '@/utils/AuthErrorCode';
import { randomBytes } from 'crypto';
import { UserInterFace } from './type';
import { generateEmail } from '@/hook/generateEmail';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Hashing } from '@/utils/hashing';
import axios from 'axios';
class UserRouterService {
  async register(username: string, email: string, password: string) {
    const hashingPassword = await Hashing.toHash(password);
    const verifyEmailToken = randomBytes(8).toString('hex');
    const user = new User({
      username,
      email,
      password: hashingPassword,
      role: 'user',
      verifyEmailToken,
    });
    return await user.save();
  }
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
  async registerTelegramWebhookDirect() {
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL;

    const response = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      { url: WEBHOOK_URL }
    );

    if (!response.data.ok) {
      throw new Error(
        `❌ Failed to register webhook: ${response.data.description}`
      );
    }
    console.log('✅ Telegram webhook registered successfully!');
    return response.data;
  }
  async findUserByEmail(email: string) {
    return await User.findOne({ email });
  }
  async getAllUser() {
    return await User.find();
  }
  async deleteUserById(id: string) {
    return await User.findByIdAndDelete(id);
  }
  async findAndVerifyEmailUser(verifyEmailToken: string) {
    const user = await User.findOne({ verifyEmailToken });
    if (!user) {
      throw new BadRequestException({
        errorCode: AuthErrorCode.INVALID_VERIFY_EMAIL_TOKEN,
        errorMessage: `Not found any user with token ${verifyEmailToken}`,
      });
    }
    if (user.isVerifyEmail) {
      throw new BadRequestException({
        errorCode: AuthErrorCode.INVALID_VERIFY_EMAIL_TOKEN,
        errorMessage: 'Email verify already',
      });
    }
    if (user.verifyEmailToken !== verifyEmailToken) {
      throw new BadRequestException({
        errorCode: AuthErrorCode.INVALID_VERIFY_EMAIL_TOKEN,
        errorMessage: 'Invalid token',
      });
    }

    user.isVerifyEmail = true;
    return await user.save();
  }
  async updateUserById(id: string, data: Partial<UserInterFace>) {
    const userId = await User.findById(id);
    if (!userId) {
      throw new Error('Not Found User');
    }
    Object.assign(userId, data);
    return await userId?.save();
  }

  async getAllUsersWithOnlineStatus(onlineUserIds: string[]) {
    const users = await User.find({}, { password: 0, verifyEmailToken: 0 });
    return users.map((user) => ({
      ...user.toObject(),
      isOnline: onlineUserIds.includes((user._id as any).toString()),
    }));
  }
}
export default new UserRouterService();
