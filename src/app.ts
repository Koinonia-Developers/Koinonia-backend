import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import cookieParser from 'cookie-parser';

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
import libraryRoutes from './modules/library/library.routes';
import membershipRoutes from './modules/membership/membership.routes';
import lmsRoutes from './modules/lms/lms.routes';
import memberAffairsRoutes from './routes/memberAffairs.routes'; 
import educationRoutes from './routes/education.routes';
import approvalsRoutes from './routes/approvals.routes';

const app: Application = express();
app.set('trust proxy', 1);

// ─── Security ───────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://endaeyesusbete.vercel.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }
        const isExactMatch = allowedOrigins.includes(origin);
        const isVercelPreview = origin.endsWith('.vercel.app');
        const isLocalhost = origin.startsWith('http://localhost:');
        if (isExactMatch || isVercelPreview || isLocalhost) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// ─── Body Parsing ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Static Files (uploaded images) ────────────────────────────────
// This can be removed after confirming Cloudinary works; keeping it for backward compatibility.
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
app.use('/api/v1/library', libraryRoutes);
app.use('/api/v1/membership', membershipRoutes);
app.use('/api/v1/lms', lmsRoutes);
app.use('/api/v1/member-affairs', memberAffairsRoutes);  
app.use('/api/v1/education', educationRoutes);
app.use('/api/v1/approvals', approvalsRoutes);

// ─── Health Check ───────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;