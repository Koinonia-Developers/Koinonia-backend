import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log("No user found");
            return;
        }

        console.log("Testing createMany notifications...");
        const res = await prisma.notification.createMany({
            data: [
                {
                    userID: user.id,
                    actorID: user.id,
                    type: 'POST',
                    content: 'Test notification payload'
                }
            ]
        });
        console.log("Success:", res);
    } catch (err: any) {
        console.error("Error creating notification:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
