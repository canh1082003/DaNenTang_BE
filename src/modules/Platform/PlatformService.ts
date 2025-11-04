import { getIO } from "@/socket";
import Platform from "../../databases/entities/Platform";
import FacebookService from "../Facebook/FacebookService";
import { updatePlatformState } from "@/init/platformStateManager";
import TelegramService from "../Telegram/TelegramService";

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
    const io = getIO();
    const lower = platform.toLowerCase();

    try {
      switch (lower) {
        case 'facebook':
          await FacebookService.ConnectFacebookWebhook();
          updatePlatformState('Facebook', 'connected', io);
          break;

        case 'telegram':
          await TelegramService.registerTelegramWebhookDirect();
          updatePlatformState('Telegram', 'connected', io);
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
    const io = getIO();
    const lower = platform.toLowerCase();

    try {
      switch (lower) {
        case 'facebook':
          await FacebookService.DisconnectFacebookWebhook();
          updatePlatformState('Facebook', 'disconnected', io);
          break;

        case 'telegram':
          await TelegramService.deleteTelegramWebhookDirect();
          updatePlatformState('Telegram', 'disconnected', io);
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

  async syncPlatform(name: string) {
    const platform = await Platform.findOne({ name });
    if (!platform){
      throw new Error('Platform not found');
    }
    platform.lastSync = new Date();
    await platform.save();
    return platform;
  }
}

export default new PlatformService();
