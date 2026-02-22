import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import announcementsRoutes from './modules/announcements/announcements.routes';
import classesRoutes from './modules/classes/classes.routes';
import postsRoutes from './modules/posts/posts.routes';
import uploadRoutes from './modules/upload/upload.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import messagesRoutes from './modules/messages/messages.routes';

const app: Application = express();

// ─── Security ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
    origin: [
        env.FRONTEND_URL || 'http://localhost:3001',
        'http://localhost:3000',
        'http://localhost:3001',
        'https://endaeyesusbete.vercel.app'
    ],
    credentials: true,
}));

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static Files (uploaded images) ────────────────────────────────
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── Routes ─────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/announcements', announcementsRoutes);
app.use('/api/v1/classes', classesRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/messages', messagesRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
