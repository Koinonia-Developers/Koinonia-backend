//src/prisma/seed-mock-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting mock data migration...');

    // Get all users
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { sex: null },
                { clerical_rank: null },
                { phone_number: null },
            ]
        }
    });

    console.log(`Found ${users.length} users to update`);

    let updated = 0;
    for (const user of users) {
        const updateData: any = {};

        // Set default sex if null
        if (!user.sex) {
            updateData.sex = 'MALE';
        }

        // Set default clerical_rank if null
        if (!user.clerical_rank) {
            updateData.clerical_rank = 'NONE';
        }

        // Set default phone number if null
        if (!user.phone_number) {
            updateData.phone_number = '0912345678';
        }

        if (Object.keys(updateData).length > 0) {
            await prisma.user.update({
                where: { id: user.id },
                data: updateData
            });
            updated++;
            console.log(`Updated user ${user.email}: ${JSON.stringify(updateData)}`);
        }
    }

    console.log(`Mock data migration completed. Updated ${updated} users.`);
}

main()
    .catch((e) => {
        console.error('Error during mock data migration:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
