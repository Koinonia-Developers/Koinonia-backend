import { Request, Response, NextFunction } from 'express';
import { messagesService } from './messages.service';

export class MessagesController {
    async getConversations(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await messagesService.getConversations(req.user!);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async searchUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await messagesService.searchUsers(req.user!, req.query.q as string);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async getChatHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await messagesService.getChatHistory(req.user!, req.params.userId as string);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }

    async sendMessage(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.body.content) throw new Error('Content is required');
            const data = await messagesService.sendMessage(req.user!, req.params.userId as string, req.body.content);
            res.status(200).json({ status: 'success', data });
        } catch (e) { next(e); }
    }
}
export const messagesController = new MessagesController();
