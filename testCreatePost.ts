import { PrismaClient } from '@prisma/client';
import { postsService } from './src/modules/posts/posts.service';
import { postsRepository } from './src/modules/posts/posts.repository';

const prisma = new PrismaClient();

async function testCreatePost() {
    try {
        const user = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
        if (!user) {
            console.log("No SUPER_ADMIN found to test with.");
            return;
        }

        console.log(`Testing as SUPER_ADMIN: ${user.username}`);

        const payload = {
            title: "Test Post",
            content: "Test Content",
            targetType: "GLOBAL" as const
        };

        // Mock the JWT payload
        const jwtPayload = {
            userID: user.id,
            role: user.role,
            serviceClassID: user.serviceClassID,
            status: user.status
        };

        console.log("Calling postsService.createPost...");
        const post = await postsService.createPost(jwtPayload as any, payload);
        console.log("Post created successfully:", post);

    } catch (e: any) {
        console.error("SERVICE ERROR:", e.message, e.stack);
    } finally {
        await prisma.$disconnect();
    }
}

testCreatePost();
