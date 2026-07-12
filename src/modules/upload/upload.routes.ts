import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';
import { BadRequestError } from '../../utils/errors';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
// streamifier doesn't have types; use require to bypass or add declaration
const streamifier = require('streamifier');

// ─── Cloudinary Configuration ──────────────────────────────────────
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ─── Multer Memory Storage ─────────────────────────────────────────
const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideos = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedPDFs = ['application/pdf'];
    
    if (allowedImages.includes(file.mimetype) || allowedVideos.includes(file.mimetype) || allowedPDFs.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BadRequestError('Only jpg, png, webp images, mp4/webm videos, and pdf files are allowed') as any, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

// ─── Helper: Upload to Cloudinary ─────────────────────────────────
async function uploadToCloudinary(buffer: Buffer, folder: string, resourceType: 'image' | 'video' | 'raw'): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
            },
            (err: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                if (err) return reject(err);
                if (!result) return reject(new Error('No result from Cloudinary'));
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

// ─── Routes ─────────────────────────────────────────────────────────

router.post(
    '/image',
    requireAuth,
    requireActiveStatus,
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No image file provided');
            const url = await uploadToCloudinary(req.file.buffer, 'announcements/images', 'image');
            res.status(200).json({ status: 'success', data: { imageURL: url } });
        } catch (e) {
            next(e);
        }
    }
);

router.post(
    '/video',
    requireAuth,
    requireActiveStatus,
    upload.single('video'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No video file provided');
            const url = await uploadToCloudinary(req.file.buffer, 'announcements/videos', 'video');
            res.status(200).json({ status: 'success', data: { videoURL: url } });
        } catch (e) {
            next(e);
        }
    }
);

router.post(
    '/pdf',
    requireAuth,
    requireActiveStatus,
    upload.single('pdf'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No PDF file provided');
            const url = await uploadToCloudinary(req.file.buffer, 'announcements/pdfs', 'raw');
            res.status(200).json({ status: 'success', data: { pdfURL: url } });
        } catch (e) {
            next(e);
        }
    }
);

// Public upload (registration profile pictures – no auth)
router.post(
    '/public-image',
    upload.single('image'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No image file provided');
            const url = await uploadToCloudinary(req.file.buffer, 'profiles', 'image');
            res.status(200).json({ status: 'success', data: { imageURL: url } });
        } catch (e) {
            next(e);
        }
    }
);

export default router;