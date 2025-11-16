import dotenv from 'dotenv';
import 'reflect-metadata';

import App from '@/app';
import { setupSocket } from './socket';
// import { verifyNgrokHealth } from './init/ngrokMonitor';

dotenv.config();
setupSocket(App.server, App.app);
// void verifyNgrokHealth();
// setInterval(verifyNgrokHealth, 3 * 60 * 1000);
void App.listen();
