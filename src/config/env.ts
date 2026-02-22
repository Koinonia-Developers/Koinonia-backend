import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8080'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
    FRONTEND_URL: z.string().optional(),
});

const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        process.exit(1);
    }
    return result.data;
};

export const env = parseEnv();
