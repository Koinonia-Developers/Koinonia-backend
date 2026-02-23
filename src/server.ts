import http from 'http';
import fs from 'fs';
import path from 'path';
import app from './app';
import { env } from './config/env';
import { db } from './config/db';

// Ensure the uploads directory always exists (important for cloud deployments)
fs.mkdirSync(path.join(process.cwd(), 'uploads'), { recursive: true });

const server = http.createServer(app);

const startServer = async () => {
    try {
        await db.$connect();
        console.log('📦 Connected to the database successfully');

        server.listen(env.PORT, () => {
            console.log(`🚀 Server is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Graceful Shutdown
process.on('SIGINT', async () => {
    await db.$disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await db.$disconnect();
    console.log('📦 Database disconnected');
    process.exit(0);
});
