import { messagesRepository } from './messages.repository';
import { notificationsRepository } from '../notifications/notifications.repository';
import { JwtPayload } from '../../middleware/auth';
import { db } from '../../config/db';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

export class MessagesService {
    async getConversations(user: JwtPayload) {
        return messagesRepository.getConversations(user.userID);
    }

    async searchUsers(user: JwtPayload, query: string) {
        if (!query || query.length < 2) return [];
        return db.user.findMany({
            where: {
                id: { not: user.userID },
                OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { username: { contains: query, mode: 'insensitive' } }
                ],
                // Members can only message leaders and admins
                ...(user.role === 'MEMBER' ? { role: { in: ['CLASS_LEADER', 'SUPER_ADMIN'] } } : {})
            },
            select: { id: true, fullName: true, profileImage: true, username: true, role: true },
            take: 10
        });
    }

    async getChatHistory(user: JwtPayload, otherUserId: string) {
        await messagesRepository.markAsRead(user.userID, otherUserId);
        return messagesRepository.getChatHistory(user.userID, otherUserId);
    }

    async sendMessage(user: JwtPayload, receiverId: string, content: string) {
        const receiver = await db.user.findUnique({ where: { id: receiverId } });
        if (!receiver) throw new NotFoundError('Receiver not found');

        if (user.role === 'MEMBER') {
            if (receiver.role === 'MEMBER') {
                throw new ForbiddenError('Members cannot message other members directly');
            }
        }

        const msg = await messagesRepository.createMessage(user.userID, receiverId, content);

        await notificationsRepository.spawnNotification({
            userID: receiverId,
            actorID: user.userID,
            type: 'MESSAGE',
            content: `Sent you a message`,
            linkTarget: `/dashboard/messages`
        });

        return msg;
    }
}
export const messagesService = new MessagesService();
