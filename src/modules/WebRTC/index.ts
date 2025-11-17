import { Router } from 'express';
import WebRtcController from './WebRtcController';
import verifyTokenMiddleware from '@/middlewares/chat.middlewares';

export const WebRtcRouter = Router();
WebRtcRouter.get(
  '/call',
  verifyTokenMiddleware,
  WebRtcController.getIceServers
);
