import { Router } from "express";
import WebRtcController from "./WebRtcController";

export const WebRtcRouter = Router();
WebRtcRouter.get("/call",WebRtcController.getIceServers);
