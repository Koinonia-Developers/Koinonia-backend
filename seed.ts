import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const desiredClasses = [
    "ትምህርት ክፍል",
    "መዝሙር ክፍል",
    "አባላት ጉዳይ ክፍል",
    "ልማት ክፍል",
    "ሒሳብና ንብረት ክፍል",
    "ሞያና አገልግሎት ክፍል",
    "የባች ማስተባበሪያ ክፍል",
    "ሳንሱርና መርሐ ግብር ዝግጅት ክፍል",
    "ኦዲትና ኢንስፔክሽን ክፍል"
];

async function main() {
    console.log("Seeding Service Classes...");

    // First delete all existing classes
    await prisma.serviceClass.deleteMany({});
    
    // Create new classes
    for (const name of desiredClasses) {
        await prisma.serviceClass.create({
            data: {
                class_name_amharic: name,
                is_public_registration: true,
            }
        });
        console.log(`Created: ${name}`);
    }

    console.log("Done seeding.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
