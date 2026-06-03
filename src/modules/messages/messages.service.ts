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
        const users = await db.user.findMany({
            where: {
                id: { not: user.userID },
                OR: [
                    { full_name_three_parts: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } }
                ],
                ...(user.role === 'MEMBER' ? {
                    system_role: {
                        in: ['SERVICE_MANAGER', 'SECRETARIAT_SECRETARY', 'SECRETARIAT_VICE', 'SECRETARIAT_CHAIRMAN']
                    }
                } : {})
            },
            select: { id: true, full_name_three_parts: true, profile_image_url: true, email: true, system_role: true },
            take: 10
        });

        return users.map(u => ({
            id: u.id,
            fullName: u.full_name_three_parts,
            profileImage: u.profile_image_url,
            username: u.email,
            role: u.system_role
        }));
    }

    async getChatHistory(user: JwtPayload, otherUserId: string) {
        await messagesRepository.markAsRead(user.userID, otherUserId);
        return messagesRepository.getChatHistory(user.userID, otherUserId);
    }

    async sendMessage(user: JwtPayload, receiverId: string, content: string) {
        const receiver = await db.user.findUnique({ where: { id: receiverId } });
        if (!receiver) throw new NotFoundError('Receiver not found');

        if (user.role === 'MEMBER') {
            if (receiver.system_role === 'MEMBER' || receiver.system_role === 'USER') {
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
