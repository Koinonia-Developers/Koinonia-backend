const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== DB Dump ===");
    const classes = await prisma.serviceClass.findMany();
    console.log("--- Service Classes ---");
    classes.forEach(c => console.log(`ID: ${c.id} | Name: ${c.class_name_amharic}`));

    const users = await prisma.user.findMany({
        include: { service_classes: true }
    });
    console.log("\n--- Users ---");
    users.forEach(u => {
        console.log(`Email: ${u.email} | SystemRole: ${u.system_role} | ServiceClass: ${u.service_classes?.class_name_amharic || 'NONE'} (${u.service_class_id || 'NULL'})`);
    });
}

main().finally(() => prisma.$disconnect());
