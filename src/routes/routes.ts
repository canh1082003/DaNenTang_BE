import ConversationRouter from '@/modules/conversation';
import ChatRouter from '../modules/Chat';
import { Router } from 'express';
import { UserRouter } from '@/modules/User';
const router = Router();
router.use('/user', UserRouter);
router.use('/chat', ChatRouter);
router.use('/conversation', ConversationRouter);
export default router;
