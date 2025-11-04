import { Router } from "express";
import PlatformController from "./PlatformController";

export const PlatformRouter = Router();

// /api/v1/platform/connect/Facebook
PlatformRouter.post("/connect/:platform",PlatformController.connectPlatform);
PlatformRouter.post("/disconnect/:platform",PlatformController.disconnectPlatform);
