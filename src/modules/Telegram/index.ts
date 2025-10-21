import { Router } from "express";
import TelegramController from "./TelegramController";

export const TelegramRouter = Router();
TelegramRouter.post(
  "/connect",
  TelegramController.registerTelegramWebhook.bind(TelegramController)
);

TelegramRouter.post(
  "/disconnect",
  TelegramController.deleteTelegramWebhook.bind(TelegramController)
);
TelegramRouter.post(
  '/send-message',
  TelegramController.sendMessageTelegram
);
TelegramRouter.post('/webhook', TelegramController.WebhookTelegram);
