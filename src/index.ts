import dotenv from 'dotenv';
import 'reflect-metadata';

import App from '@/app';
import { setupSocket } from './socket';
import { initTelegramWebhook } from './init/telegram';
// import { initZaloBot } from './modules/Zalo/zaloBot';

dotenv.config();
setupSocket(App.server, App.app);
void initTelegramWebhook();
// initZaloBot(App.app.get('io')).catch(console.error);
void App.listen();
