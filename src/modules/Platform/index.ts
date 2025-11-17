import { Router } from "express";
import PlatformController from "./PlatformController";

export const PlatformRouter = Router();

// /api/v1/platform/connect/Facebook

PlatformRouter.post("/connect/:platform",PlatformController.connectPlatform);
PlatformRouter.post("/disconnect/:platform",PlatformController.disconnectPlatform);
PlatformRouter.get("/all",PlatformController.getAllPlatforms);
PlatformRouter.post("/create",PlatformController.createPlatform);
PlatformRouter.get('/status', PlatformController.getPlatformStatus);
