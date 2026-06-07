import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const serviceClasses = [
    { class_name_amharic: 'ትምርት ክፍል' },
    { class_name_amharic: 'መዝሙር ክፍል' },
    { class_name_amharic: 'ጉዳይ ኣባላት' },
    { class_name_amharic: 'ልምዓት ክፍል' },
    { class_name_amharic: 'ሞያን ኣገልግሎት' },
    { class_name_amharic: 'ባች ክፍል' },
    { class_name_amharic: 'ሳንሱር' },
    { class_name_amharic: 'ሕሳብ' },
    { class_name_amharic: 'ኦዲት' },
];

async function seedServiceClasses() {
    console.log('Starting to seed service classes...');

    for (const sc of serviceClasses) {
        try {
            const existing = await prisma.serviceClass.findUnique({
                where: { class_name_amharic: sc.class_name_amharic }
            });

            if (existing) {
                console.log(`Service class ${sc.class_name_amharic} already exists, skipping...`);
                continue;
            }

            await prisma.serviceClass.create({
                data: {
                    class_name_amharic: sc.class_name_amharic,
                    is_public_registration: true
                }
            });

            console.log(`✓ Created ${sc.class_name_amharic}`);
        } catch (error) {
            console.error(`✗ Failed to create ${sc.class_name_amharic}:`, error);
        }
    }

    console.log('Service classes seeding completed!');
}

seedServiceClasses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
