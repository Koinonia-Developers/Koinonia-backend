import { db } from '../../config/db';
import crypto from 'crypto';

interface MessageType {
    id: string;
    senderID: string;
    receiverID: string;
    content: string;
    isRead: boolean;
    createdAt: Date;
}

const inMemoryMessages: MessageType[] = [];

export class MessagesRepository {
    async createMessage(senderID: string, receiverID: string, content: string) {
        const msg: MessageType = {
            id: crypto.randomUUID(),
            senderID,
            receiverID,
            content,
            isRead: false,
            createdAt: new Date()
        };
        inMemoryMessages.push(msg);

        const sender = await db.user.findUnique({
            where: { id: senderID },
            select: { id: true, full_name_three_parts: true, profile_image_url: true }
        });

        return {
            ...msg,
            sender: sender ? {
                id: sender.id,
                fullName: sender.full_name_three_parts,
                profileImage: sender.profile_image_url
            } : null
        };
    }

    async getConversations(userID: string) {
        const userMessages = inMemoryMessages.filter(
            m => m.senderID === userID || m.receiverID === userID
        ).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const conversations = new Map<string, any>();
        for (const msg of userMessages) {
            const otherUserID = msg.senderID === userID ? msg.receiverID : msg.senderID;
            if (!conversations.has(otherUserID)) {
                const otherUser = await db.user.findUnique({
                    where: { id: otherUserID },
                    select: { id: true, full_name_three_parts: true, profile_image_url: true, email: true, system_role: true }
                });

                if (otherUser) {
                    conversations.set(otherUserID, {
                        user: {
                            id: otherUser.id,
                            fullName: otherUser.full_name_three_parts,
                            profileImage: otherUser.profile_image_url,
                            username: otherUser.email,
                            role: otherUser.system_role
                        },
                        lastMessage: msg,
                        unreadCount: msg.receiverID === userID && !msg.isRead ? 1 : 0
                    });
                }
            } else {
                if (msg.receiverID === userID && !msg.isRead) {
                    const c = conversations.get(otherUserID);
                    c.unreadCount += 1;
                }
            }
        }
        return Array.from(conversations.values());
    }

    async getChatHistory(user1: string, user2: string) {
        const chatMessages = inMemoryMessages.filter(
            m => (m.senderID === user1 && m.receiverID === user2) ||
                 (m.senderID === user2 && m.receiverID === user1)
        ).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        const results = [];
        for (const msg of chatMessages) {
            const sender = await db.user.findUnique({
                where: { id: msg.senderID },
                select: { id: true, full_name_three_parts: true, profile_image_url: true }
            });
            results.push({
                ...msg,
                sender: sender ? {
                    id: sender.id,
                    fullName: sender.full_name_three_parts,
                    profileImage: sender.profile_image_url
                } : null
            });
        }
        return results;
    }

    async markAsRead(user1: string, user2: string) {
        for (const msg of inMemoryMessages) {
            if (msg.senderID === user2 && msg.receiverID === user1 && !msg.isRead) {
                msg.isRead = true;
            }
        }
        return { count: 1 };
    }
}
export const messagesRepository = new MessagesRepository();
