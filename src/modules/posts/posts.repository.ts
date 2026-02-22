import { db } from '../../config/db';

export class PostsRepository {
    async createPost(data: {
        authorID: string;
        title: string;
        content: string;
        imageURL?: string;
        targetType: 'GLOBAL' | 'CLASS';
        serviceClassID?: string;
    }) {
        return db.post.create({
            data,
            include: { author: { select: { id: true, username: true, fullName: true, profileImage: true } } },
        });
    }

    async getPostsForUser(userClassID: string, role: string) {
        if (role === 'SUPER_ADMIN') {
            return db.post.findMany({
                orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
                include: {
                    author: { select: { id: true, username: true, fullName: true, profileImage: true } },
                    _count: { select: { reactions: true, comments: true } },
                },
            });
        }

        return db.post.findMany({
            where: {
                OR: [
                    { targetType: 'GLOBAL' },
                    { targetType: 'CLASS', serviceClassID: userClassID },
                ],
            },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
            include: {
                author: { select: { id: true, username: true, fullName: true, profileImage: true } },
                _count: { select: { reactions: true, comments: true } },
            },
        });
    }

    async findPostById(id: string) {
        return db.post.findUnique({
            where: { id },
            include: { author: { select: { id: true, username: true, role: true, classLeaderOf: true } } },
        });
    }

    async deletePost(id: string) {
        return db.post.delete({ where: { id } });
    }

    async pinPost(id: string, isPinned: boolean) {
        return db.post.update({ where: { id }, data: { isPinned } });
    }

    // ─── Reactions ───────────────────────────────────────────────────
    async upsertReaction(postID: string, userID: string, reactionType: 'LIKE' | 'DISLIKE') {
        return db.postReaction.upsert({
            where: { postID_userID: { postID, userID } },
            update: { reactionType },
            create: { postID, userID, reactionType },
        });
    }

    async getReactionCounts(postID: string) {
        const [likes, dislikes] = await Promise.all([
            db.postReaction.count({ where: { postID, reactionType: 'LIKE' } }),
            db.postReaction.count({ where: { postID, reactionType: 'DISLIKE' } }),
        ]);
        return { likes, dislikes };
    }

    async getUserReaction(postID: string, userID: string) {
        return db.postReaction.findUnique({ where: { postID_userID: { postID, userID } } });
    }

    // ─── Comments ───────────────────────────────────────────────────
    async createComment(postID: string, userID: string, content: string, parentCommentID?: string) {
        return db.comment.create({
            data: { postID, userID, content, parentCommentID },
            include: { user: { select: { id: true, username: true, fullName: true, profileImage: true } } },
        });
    }

    async getComments(postID: string) {
        return db.comment.findMany({
            where: { postID },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true, username: true, fullName: true, profileImage: true } } },
        });
    }

    async findCommentById(id: string) {
        return db.comment.findUnique({
            where: { id },
            include: { post: { select: { serviceClassID: true, authorID: true } } },
        });
    }

    async deleteComment(id: string) {
        return db.comment.delete({ where: { id } });
    }
}

export const postsRepository = new PostsRepository();
