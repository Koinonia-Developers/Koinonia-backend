import { db } from '../../config/db';

export class MessagesRepository {
    async createMessage(senderID: string, receiverID: string, content: string) {
        return db.message.create({
            data: { senderID, receiverID, content },
            include: { sender: { select: { id: true, fullName: true, profileImage: true } } }
        });
    }

    async getConversations(userID: string) {
        const messages = await db.message.findMany({
            where: { OR: [{ senderID: userID }, { receiverID: userID }] },
            orderBy: { createdAt: 'desc' },
            include: {
                sender: { select: { id: true, fullName: true, profileImage: true, username: true, role: true } },
                receiver: { select: { id: true, fullName: true, profileImage: true, username: true, role: true } }
            }
        });

        const conversations = new Map<string, any>();
        for (const msg of messages) {
            const otherUser = msg.senderID === userID ? msg.receiver : msg.sender;
            if (!conversations.has(otherUser.id)) {
                conversations.set(otherUser.id, {
                    user: otherUser,
                    lastMessage: msg,
                    unreadCount: msg.receiverID === userID && !msg.isRead ? 1 : 0
                });
            } else {
                if (msg.receiverID === userID && !msg.isRead) {
                    const c = conversations.get(otherUser.id);
                    c.unreadCount += 1;
                }
            }
        }
        return Array.from(conversations.values());
    }

    async getChatHistory(user1: string, user2: string) {
        return db.message.findMany({
            where: {
                OR: [
                    { senderID: user1, receiverID: user2 },
                    { senderID: user2, receiverID: user1 }
                ]
            },
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { id: true, fullName: true, profileImage: true } } }
        });
    }

    async markAsRead(user1: string, user2: string) {
        return db.message.updateMany({
            where: { senderID: user2, receiverID: user1, isRead: false },
            data: { isRead: true }
        });
    }
}
export const messagesRepository = new MessagesRepository();
