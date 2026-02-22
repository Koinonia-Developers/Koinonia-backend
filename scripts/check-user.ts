import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Looking up user 'endaeyesus'...");
    const user = await prisma.user.findUnique({
        where: { username: 'endaeyesus' }
    });
    console.log("User found:", user);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
