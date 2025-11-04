import ConversationRouter from '@/modules/conversation';
import ChatRouter from '../modules/Chat';
import { Router } from 'express';
import { UserRouter } from '@/modules/User';
import { TelegramRouter } from '@/modules/Telegram';
import { FacebookRouter } from '@/modules/Facebook';
import { PlatformRouter } from '@/modules/Platform';
import { DashboardRouter } from '@/modules/Dashboard';
const router = Router();
router.use('/user', UserRouter);
router.use('/chat', ChatRouter);
router.use('/conversation', ConversationRouter);
router.use('/telegram', TelegramRouter);
router.use('/facebook', FacebookRouter);
router.use('/platform', PlatformRouter);
router.use('/dasbboard', DashboardRouter);
router.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, message: 'Server is healthy 💚' });
});

export default router;
