import Message from "../../databases/entities/Message";
import Platform, { IPlatform } from "../../databases/entities/Platform";
import FacebookService from "../Facebook/FacebookService";
import TelegramService from "../Telegram/TelegramService";
import Conversation from "../../databases/entities/Conversation";

class PlatformService {
  async getAllPlatforms() {
    return await Platform.find();
  }

  async getPlatformDetail(name: string) {
    return await Platform.findOne({ name });
  }

  // async connectPlatform(name: string) {
  //   return await Platform.findOneAndUpdate(
  //     { name },
  //     { status: 'connected', connectedAt: new Date() },
  //     { upsert: true, new: true }
  //   );
  // }

  // async disconnectPlatform(name: string) {
  //   return await Platform.findOneAndUpdate(
  //     { name },
  //     { status: 'disconnected', disconnectedAt: new Date() },
  //     { new: true }
  //   );
  // }
  async connectPlatform(platform: string) {
    const lower = platform.toLowerCase();

    try {
      switch (lower) {
        case 'facebook':
          await FacebookService.ConnectFacebookWebhook();
          await this.updatePlatformStatus("Facebook", "connected");
          break;

        case 'telegram':
          await TelegramService.registerTelegramWebhookDirect();
          await this.updatePlatformStatus("Telegram", "connected");
          break;

        default:
          // eslint-disable-next-line no-case-declarations
          const error = new Error('Unsupported platform');
          (error as any).status = 400;
          throw error;
      }

      return {
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        status: 'connected',
      };
    } catch (error: any) {
      console.error(`❌ Connect ${platform} failed:`, error.message);
      throw error;
    }
  }
   async disconnectPlatform(platform: string) {
    const lower = platform.toLowerCase();

    try {
      switch (lower) {
        case 'facebook':
          await FacebookService.DisconnectFacebookWebhook();
           await this.updatePlatformStatus("Facebook", "disconnected");
          break;

        case 'telegram':
          await TelegramService.deleteTelegramWebhookDirect();
          await this.updatePlatformStatus("Telegram", "disconnected");
          break;

        default:
          // eslint-disable-next-line no-case-declarations
          const error = new Error('Unsupported platform');
          (error as any).status = 400;
          throw error;
      }

      return {
        platform: platform.charAt(0).toUpperCase() + platform.slice(1),
        status: 'disconnected',
      };
    } catch (error: any) {
      console.error(`❌ Disconnect ${platform} failed:`, error.message);
      throw error;
    }
  }
  private async updatePlatformStatus(name: string, status: string) {
    const platformDoc = await Platform.findOne({ name });

    if (!platformDoc) {
      throw new Error(`Platform ${name} not found`);
    }

    Object.assign(platformDoc, { status });
    await platformDoc.save();

    console.log(`✅ Updated ${name} status to "${status}"`);
    return platformDoc;
  }
  async syncPlatform(name: string) {
    const platform = await Platform.findOne({ name });
    if (!platform){
      throw new Error('Platform not found');
    }
    platform.lastSync = new Date();
    await platform.save();
    return platform;
  }
  async createPlatform(data: Partial<IPlatform>) {
    const exist = await Platform.findOne({ name: data.name });
    if (exist) {
      throw new Error(`Platform "${data.name}" already exists.`);
    }

    const newPlatform = await Platform.create({
      ...data,
      status: data.status || 'disconnected',
    });

    console.log(`🌱 Created new platform: ${newPlatform.name}`);
    return newPlatform;
  }
   async getPlatformStatus() {
      const platforms= await Platform.find({}, 'name status connectedAt disconnectedAt');
      const enriched = await Promise.all(
        platforms.map(async (p) => {
          const platformName = p.name;

          // 🔹 Tìm tất cả các conversation thuộc platform này
          const conversations = await Conversation.find({
            name: { $regex: platformName, $options: "i" },
          })
            .populate("participants", "_id username")
            .lean();

          // 🔹 Đếm unique user
          const userSet = new Set<string>();
          conversations.forEach((c) => {
            c.participants?.forEach((u: any) => userSet.add(String(u._id)));
          });

          // 🔹 Đếm tổng số message trong các conversation đó
          const totalMessages = await Message.countDocuments({
            conversation: { $in: conversations.map((c) => c._id) },
          });

          return {
            ...p,
            totalUsers: userSet.size,
            totalMessages,
          };
        })
      );
      return enriched;
    }

}

export default new PlatformService();
