import { Router } from "express";
import FacebookController from "./FacebookController";

export const FacebookRouter = Router();
FacebookRouter.get(
  '/webhook',
  FacebookController.WebhookFacebook.bind(FacebookController)
);

FacebookRouter.post(
  '/webhook',
  FacebookController.WebhookFacebook.bind(FacebookController)
);
FacebookRouter.post(
  '/connect',
  FacebookController.ConnectFacebookWebhook.bind(FacebookController)
);

FacebookRouter.post(
  '/disconnect',
  FacebookController.DisconnectFacebookWebhook.bind(FacebookController)
);
