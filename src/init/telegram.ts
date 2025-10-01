import userRouterService from '../modules/User/userService';

export async function initTelegramWebhook() {
  await userRouterService.registerTelegramWebhookDirect();
}
