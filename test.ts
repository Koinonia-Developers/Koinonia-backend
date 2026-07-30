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
                    user_id: user.id,          // ✅ correct field name
                    title: 'Test Notification', // ✅ required field
                    message: 'Test notification payload', // optional field
                    type: 'POST',               // optional but you can keep it
                    is_read: false,             // optional (default is false)
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