import { Router } from 'express';
import { postsController } from './posts.controller';
import { requireAuth, requireActiveStatus, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPostSchema, reactToPostSchema, createCommentSchema, postIdParamSchema, commentIdParamSchema } from './posts.schema';

const router = Router();
const auth = [requireAuth, requireActiveStatus];
const canPost = [requireAuth, requireActiveStatus, requireRole(['SUPER_ADMIN', 'CLASS_LEADER'])];
const superAdmin = [requireAuth, requireActiveStatus, requireRole(['SUPER_ADMIN'])];

// Posts
router.get('/', ...auth, postsController.getPosts);
router.post('/', ...canPost, validate(createPostSchema), postsController.createPost);
router.delete('/:id', ...auth, validate(postIdParamSchema), postsController.deletePost);
router.patch('/:id/pin', ...superAdmin, validate(postIdParamSchema), postsController.pinPost);

// Reactions
router.post('/:id/react', ...auth, validate(reactToPostSchema), postsController.reactToPost);

// Comments
router.get('/:id/comments', ...auth, validate(postIdParamSchema), postsController.getComments);
router.post('/:id/comments', ...auth, validate(createCommentSchema), postsController.addComment);
router.delete('/:id/comments/:commentId', ...auth, validate(commentIdParamSchema), postsController.deleteComment);

export default router;
