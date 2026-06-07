import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const executiveServiceClassMappings = [
    { email: 'nahomgmedhin@gmail.com', serviceClass: 'ትምርት ክፍል' },
    { email: 'rediettsegay@gmail.com', serviceClass: 'መዝሙር ክፍል' },
    { email: 'tewodrosbeyene@gmail.com', serviceClass: 'ጉዳይ ኣባላት' },
    { email: 'kibromgselassie@gmail.com', serviceClass: 'ልምዓት ክፍል' },
    { email: 'henokelias@gmail.com', serviceClass: 'ሞያን ኣገልግሎት' },
    { email: 'yirgagetachew@gmail.com', serviceClass: 'ባች ክፍል' },
    { email: 'akillegizabher@gmail.com', serviceClass: 'ሳንሱር' },
    { email: 'mashohadush@gmail.com', serviceClass: 'ሕሳብ' },
    { email: 'abelguesh@gmail.com', serviceClass: 'ኦዲት' },
];

async function updateExecutiveServiceClasses() {
    console.log('Starting to update executive service class assignments...');

    for (const mapping of executiveServiceClassMappings) {
        try {
            // Find the user
            const user = await prisma.user.findUnique({
                where: { email: mapping.email }
            });

            if (!user) {
                console.log(`User ${mapping.email} not found, skipping...`);
                continue;
            }

            // Find the service class
            const serviceClass = await prisma.serviceClass.findUnique({
                where: { class_name_amharic: mapping.serviceClass }
            });

            if (!serviceClass) {
                console.log(`Service class ${mapping.serviceClass} not found, skipping...`);
                continue;
            }

            // Update the user with the service class
            await prisma.user.update({
                where: { id: user.id },
                data: { service_class_id: serviceClass.id }
            });

            console.log(`✓ Updated ${user.full_name_three_parts} with service class ${mapping.serviceClass}`);
        } catch (error) {
            console.error(`✗ Failed to update ${mapping.email}:`, error);
        }
    }

    console.log('Service class assignments completed!');
}

updateExecutiveServiceClasses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
