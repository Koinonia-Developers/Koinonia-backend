import { postsRepository } from './posts.repository';
import { JwtPayload } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { CreatePostInput, ReactInput, CreateCommentInput } from './posts.schema';
import { db } from '../../config/db';
import { notificationsRepository } from '../notifications/notifications.repository';

export class PostsService {
    async createPost(user: JwtPayload, body: CreatePostInput) {
        if (user.role === 'MEMBER') throw new ForbiddenError('Members cannot create posts');

        if (body.targetType === 'GLOBAL' && user.role !== 'SUPER_ADMIN') {
            throw new ForbiddenError('Only SUPER_ADMIN can create global posts');
        }

        if (body.targetType === 'CLASS') {
            if (!body.serviceClassID) throw new BadRequestError('serviceClassID is required for CLASS posts');

            if (user.role === 'CLASS_LEADER') {
                const effectiveClassId = user.classLeaderOf || user.serviceClassID;
                if (body.serviceClassID !== effectiveClassId) {
                    throw new ForbiddenError('CLASS_LEADER can only post in their own class');
                }
            }

            const cls = await db.serviceClass.findUnique({ where: { id: body.serviceClassID } });
            if (!cls) throw new NotFoundError('Service class not found');
        }

        await db.activityLog.create({
            data: {
                actorID: user.userID, actionType: 'CREATE_POST',
                description: `Created post: "${body.title}"`,
            },
        });

        const post = await postsRepository.createPost({ authorID: user.userID, ...body });

        // Spawn notifications
        let targetUserIds: string[] = [];
        if (body.targetType === 'GLOBAL') {
            const users = await db.user.findMany({ select: { id: true } });
            targetUserIds = users.map(u => u.id);
        } else if (body.targetType === 'CLASS' && body.serviceClassID) {
            const users = await db.user.findMany({ where: { serviceClassID: body.serviceClassID }, select: { id: true } });
            targetUserIds = users.map(u => u.id);
        }
        try {
            await notificationsRepository.spawnBulkNotifications(targetUserIds, {
                actorID: user.userID,
                type: 'POST',
                content: `New post: ${post.title}`,
                linkTarget: `/dashboard/posts#${post.id}`
            });
        } catch (e: any) {
            console.error('Failed to spawn post notifications:', e);
        }

        return post;
    }

    async getPosts(user: JwtPayload) {
        return postsRepository.getPostsForUser(user.serviceClassID, user.role);
    }

    async deletePost(user: JwtPayload, postId: string) {
        const post = await postsRepository.findPostById(postId);
        if (!post) throw new NotFoundError('Post not found');

        const isAuthor = post.authorID === user.userID;
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const effectiveClassId = user.classLeaderOf || user.serviceClassID;
        const isClassLeaderOfPost = user.role === 'CLASS_LEADER' && post.serviceClassID === effectiveClassId;

        if (!isAuthor && !isSuperAdmin && !isClassLeaderOfPost) {
            throw new ForbiddenError('Not authorized to delete this post');
        }

        return postsRepository.deletePost(postId);
    }

    async pinPost(user: JwtPayload, postId: string) {
        if (user.role !== 'SUPER_ADMIN') throw new ForbiddenError('Only SUPER_ADMIN can pin posts');
        const post = await postsRepository.findPostById(postId);
        if (!post) throw new NotFoundError('Post not found');
        return postsRepository.pinPost(postId, !post.isPinned);
    }

    async react(user: JwtPayload, postId: string, body: ReactInput) {
        const post = await postsRepository.findPostById(postId);
        if (!post) throw new NotFoundError('Post not found');
        const reaction = await postsRepository.upsertReaction(postId, user.userID, body.reactionType);
        const counts = await postsRepository.getReactionCounts(postId);
        return { reaction, counts };
    }

    async getComments(postId: string) {
        const post = await postsRepository.findPostById(postId);
        if (!post) throw new NotFoundError('Post not found');
        return postsRepository.getComments(postId);
    }

    async addComment(user: JwtPayload, postId: string, body: CreateCommentInput) {
        const post = await postsRepository.findPostById(postId);
        if (!post) throw new NotFoundError('Post not found');

        // Single-level nesting logic
        let effectiveParentID = body.parentCommentID;
        if (effectiveParentID) {
            const parentComment = await postsRepository.findCommentById(effectiveParentID);
            if (!parentComment) throw new NotFoundError('Parent comment not found');
            if (parentComment.parentCommentID) {
                // The parent is already a reply, attach to root comment instead
                effectiveParentID = parentComment.parentCommentID;
            }
        }

        const comment = await postsRepository.createComment(postId, user.userID, body.content, effectiveParentID);

        if (effectiveParentID) {
            const parentComment = await postsRepository.findCommentById(effectiveParentID);
            if (parentComment && parentComment.userID !== user.userID) {
                await notificationsRepository.spawnNotification({
                    userID: parentComment.userID, actorID: user.userID,
                    type: 'REPLY', content: `Replied to your comment`,
                    linkTarget: `/dashboard/posts#${post.id}`
                });
            }
        } else if (post.authorID !== user.userID) {
            await notificationsRepository.spawnNotification({
                userID: post.authorID, actorID: user.userID,
                type: 'REPLY', content: `Commented on your post`,
                linkTarget: `/dashboard/posts#${post.id}`
            });
        }

        return comment;
    }

    async deleteComment(user: JwtPayload, postId: string, commentId: string) {
        const comment = await postsRepository.findCommentById(commentId);
        if (!comment) throw new NotFoundError('Comment not found');
        if (comment.postID !== postId) throw new BadRequestError('Comment does not belong to this post');

        const isAuthor = comment.userID === user.userID;
        const isSuperAdmin = user.role === 'SUPER_ADMIN';
        const effectiveClassId = user.classLeaderOf || user.serviceClassID;
        const isClassLeaderOfPost = user.role === 'CLASS_LEADER' && comment.post?.serviceClassID === effectiveClassId;

        if (!isAuthor && !isSuperAdmin && !isClassLeaderOfPost) {
            throw new ForbiddenError('Not authorized to delete this comment');
        }

        return postsRepository.deleteComment(commentId);
    }
}

export const postsService = new PostsService();
