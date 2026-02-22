import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { requireAuth, requireActiveStatus } from '../../middleware/auth';
import { BadRequestError } from '../../utils/errors';

// Store uploaded files in uploads/ directory
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, 'uploads/'),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unique}${path.extname(file.originalname)}`);
    },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new BadRequestError('Only jpg, png, and webp images are allowed') as any, false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const router = Router();

router.post(
    '/image',
    requireAuth,
    requireActiveStatus,
    upload.single('image'),
    (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No image file provided');
            const imageURL = `/uploads/${req.file.filename}`;
            res.status(200).json({ status: 'success', data: { imageURL } });
        } catch (e) {
            next(e);
        }
    }
);

// Special route for registration/public uploads that don't have a token yet
router.post(
    '/public-image',
    upload.single('image'),
    (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.file) throw new BadRequestError('No image file provided');
            const imageURL = `/uploads/${req.file.filename}`;
            res.status(200).json({ status: 'success', data: { imageURL } });
        } catch (e) {
            next(e);
        }
    }
);

export default router;
