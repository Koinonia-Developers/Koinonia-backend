import { db } from '../../config/db';
import { reaction_type } from '@prisma/client';

export class PostsRepository {
    async createPost(data: {
        authorID: string;
        title: string;
        content: string;
        targetType: 'GLOBAL' | 'CLASS';
        serviceClassID?: string;
    }) {
        const result = await db.announcement.create({
            data: {
                title: data.title,
                content: data.content,
                is_public: data.targetType === 'GLOBAL',
                target_class_id: data.targetType === 'CLASS' ? data.serviceClassID : null,
                author_id: data.authorID
            },
            include: { users: { select: { id: true, email: true, full_name_three_parts: true, profile_image_url: true } } },
        });

        return {
            id: result.id,
            title: result.title,
            content: result.content,
            targetType: result.is_public ? 'GLOBAL' : 'CLASS' as const,
            serviceClassID: result.target_class_id,
            authorID: result.author_id,
            createdAt: result.published_at,
            isPinned: false,
            author: result.users ? {
                id: result.users.id,
                username: result.users.email,
                fullName: result.users.full_name_three_parts,
                profileImage: result.users.profile_image_url
            } : null
        };
    }

    async getPostsForUser(userClassID: string | null, role: string) {
        const isSuperAdmin = ['SECRETARIAT_CHAIRMAN', 'SECRETARIAT_VICE', 'SECRETARIAT_SECRETARY', 'SUPER_ADMIN'].includes(role);
        
        const whereClause = isSuperAdmin ? {} : {
            OR: [
                { is_public: true },
                { is_public: false, target_class_id: userClassID || undefined },
            ]
        };

        const results = await db.announcement.findMany({
            where: whereClause,
            orderBy: { published_at: 'desc' },
            include: {
                users: { select: { id: true, email: true, full_name_three_parts: true, profile_image_url: true } },
                _count: { select: { reactions: true, comments: true } },
            },
        });

        return results.map(r => ({
            id: r.id,
            title: r.title,
            content: r.content,
            targetType: r.is_public ? 'GLOBAL' : 'CLASS' as const,
            serviceClassID: r.target_class_id,
            authorID: r.author_id,
            createdAt: r.published_at,
            isPinned: false,
            author: r.users ? {
                id: r.users.id,
                username: r.users.email,
                fullName: r.users.full_name_three_parts,
                profileImage: r.users.profile_image_url
            } : null,
            _count: {
                reactions: r._count.reactions,
                comments: r._count.comments
            }
        }));
    }

    async findPostById(id: string) {
        const result = await db.announcement.findUnique({
            where: { id },
            include: { users: { select: { id: true, email: true, system_role: true } } },
        });
        if (!result) return null;
        return {
            id: result.id,
            title: result.title,
            content: result.content,
            targetType: result.is_public ? 'GLOBAL' : 'CLASS' as const,
            serviceClassID: result.target_class_id,
            authorID: result.author_id,
            createdAt: result.published_at,
            isPinned: false,
            author: result.users ? {
                id: result.users.id,
                username: result.users.email,
                role: result.users.system_role
            } : null
        };
    }

    async deletePost(id: string) {
        return db.announcement.delete({ where: { id } });
    }

    async pinPost(id: string, isPinned: boolean) {
        return { id, isPinned };
    }

    // ─── Reactions ───────────────────────────────────────────────────
    async upsertReaction(postID: string, userID: string, reactionType: 'LIKE' | 'DISLIKE') {
        const dbReactionType: reaction_type = reactionType === 'DISLIKE' ? 'STAR' : 'LIKE';
        return db.reactions.upsert({
            where: { announcement_id_user_id: { announcement_id: postID, user_id: userID } },
            update: { reaction_type: dbReactionType },
            create: { announcement_id: postID, user_id: userID, reaction_type: dbReactionType },
        });
    }

    async getReactionCounts(postID: string) {
        const [likes, stars] = await Promise.all([
            db.reactions.count({ where: { announcement_id: postID, reaction_type: 'LIKE' } }),
            db.reactions.count({ where: { announcement_id: postID, reaction_type: 'STAR' } }),
        ]);
        return { likes, dislikes: stars };
    }

    async getUserReaction(postID: string, userID: string) {
        const reaction = await db.reactions.findUnique({ where: { announcement_id_user_id: { announcement_id: postID, user_id: userID } } });
        if (!reaction) return null;
        return {
            id: reaction.id,
            postID: reaction.announcement_id,
            userID: reaction.user_id,
            reactionType: reaction.reaction_type === 'STAR' ? 'DISLIKE' as const : 'LIKE' as const
        };
    }

    // ─── Comments ───────────────────────────────────────────────────
    async createComment(postID: string, userID: string, content: string, parentCommentID?: string) {
        const result = await db.comment.create({
            data: {
                announcement_id: postID,
                author_id: userID,
                content,
                parent_comment_id: parentCommentID || null
            },
            include: { users: { select: { id: true, email: true, full_name_three_parts: true, profile_image_url: true } } },
        });
        return {
            id: result.id,
            postID: result.announcement_id,
            userID: result.author_id,
            content: result.content,
            parentCommentID: result.parent_comment_id,
            createdAt: result.created_at,
            user: result.users ? {
                id: result.users.id,
                username: result.users.email,
                fullName: result.users.full_name_three_parts,
                profileImage: result.users.profile_image_url
            } : null
        };
    }

    async getComments(postID: string) {
        const results = await db.comment.findMany({
            where: { announcement_id: postID },
            orderBy: { created_at: 'asc' },
            include: { users: { select: { id: true, email: true, full_name_three_parts: true, profile_image_url: true } } },
        });
        return results.map(r => ({
            id: r.id,
            postID: r.announcement_id,
            userID: r.author_id,
            content: r.content,
            parentCommentID: r.parent_comment_id,
            createdAt: r.created_at,
            user: r.users ? {
                id: r.users.id,
                username: r.users.email,
                fullName: r.users.full_name_three_parts,
                profileImage: r.users.profile_image_url
            } : null
        }));
    }

    async findCommentById(id: string) {
        const result = await db.comment.findUnique({
            where: { id },
            include: { announcements: { select: { target_class_id: true, author_id: true } } },
        });
        if (!result) return null;
        return {
            id: result.id,
            postID: result.announcement_id,
            userID: result.author_id,
            content: result.content,
            parentCommentID: result.parent_comment_id,
            createdAt: result.created_at,
            post: result.announcements ? {
                serviceClassID: result.announcements.target_class_id,
                authorID: result.announcements.author_id
            } : null
        };
    }

    async deleteComment(id: string) {
        return db.comment.delete({ where: { id } });
    }
}

export const postsRepository = new PostsRepository();
