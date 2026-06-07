import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            full_name_three_parts: true,
            system_role: true,
            sex: true,
            phone_number: true,
            clerical_rank: true,
            created_at: true,
        },
    });

    console.log('Users in database:', users.length);
    console.table(users);
}

checkUsers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
