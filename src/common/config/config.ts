import dotenv from 'dotenv';
import { ENV } from '@/common/interfaces/env';
dotenv.config();
class ConfigService {
  getEnv(key: keyof ENV): string {
    if (!process.env[key]) {
      throw new Error(key + ' environment variable does not set');
    }
    return process.env[key]!;
  }

  get isProduction(): boolean {
    return this.getEnv('NODE_ENV') === 'production';
  }
  get isDevelopment(): boolean {
    return this.getEnv('NODE_ENV') === 'development';
  }
  get contextPath(): string {
    return this.getEnv('CONTEXT_PATH');
  }

  get portServer(): number {
    return Number.parseInt(this.getEnv('PORT'));
  }

  get hostServer(): string {
    return this.getEnv('HOST');
  }
  get JWTKey(): string {
    return this.getEnv('JWT_KEY');
  }

  get mongoUrl(): string {
    return this.getEnv('MONGO_URL');
  }
}
const config = new ConfigService();
export default config;
