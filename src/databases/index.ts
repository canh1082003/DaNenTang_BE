import config from '@/common/config/config';
import mongoose from 'mongoose';
export const connectDatabase = async () => {
    try {
        await mongoose.connect(config.mongoUrl);
        console.info('Database connected successfully!');
    } catch (error) {
        console.error('Database connection failed:', error);
    }
};
