import { Request, Response, NextFunction } from 'express';
import { postsService } from './posts.service';

export class PostsController {
    async getPosts(req: Request, res: Response, next: NextFunction) {
        try {
            const posts = await postsService.getPosts(req.user!);
            res.status(200).json({ status: 'success', data: posts });
        } catch (e) { next(e); }
    }

    async createPost(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await postsService.createPost(req.user!, req.body);
            res.status(201).json({ status: 'success', data: post });
        } catch (e) { next(e); }
    }

    async deletePost(req: Request, res: Response, next: NextFunction) {
        try {
            await postsService.deletePost(req.user!, req.params.id as string);
            res.status(200).json({ status: 'success', message: 'Post deleted' });
        } catch (e) { next(e); }
    }

    async pinPost(req: Request, res: Response, next: NextFunction) {
        try {
            const post = await postsService.pinPost(req.user!, req.params.id as string);
            res.status(200).json({ status: 'success', data: post });
        } catch (e) { next(e); }
    }

    async reactToPost(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await postsService.react(req.user!, req.params.id as string, req.body);
            res.status(200).json({ status: 'success', data: result });
        } catch (e) { next(e); }
    }

    async getComments(req: Request, res: Response, next: NextFunction) {
        try {
            const comments = await postsService.getComments(req.params.id as string);
            res.status(200).json({ status: 'success', data: comments });
        } catch (e) { next(e); }
    }

    async addComment(req: Request, res: Response, next: NextFunction) {
        try {
            const comment = await postsService.addComment(req.user!, req.params.id as string, req.body);
            res.status(201).json({ status: 'success', data: comment });
        } catch (e) { next(e); }
    }

    async deleteComment(req: Request, res: Response, next: NextFunction) {
        try {
            await postsService.deleteComment(req.user!, req.params.id as string, req.params.commentId as string);
            res.status(200).json({ status: 'success', message: 'Comment deleted' });
        } catch (e) { next(e); }
    }
}

export const postsController = new PostsController();
