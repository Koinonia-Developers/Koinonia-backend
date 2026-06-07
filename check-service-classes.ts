import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServiceClasses() {
    const serviceClasses = await prisma.serviceClass.findMany();
    console.log('Service classes in database:', serviceClasses.length);
    console.table(serviceClasses);
}

checkServiceClasses()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
