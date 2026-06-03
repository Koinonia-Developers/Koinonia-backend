const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'EndaEyesus2025!';
const SALT_ROUNDS = 12;

// Service Department Names (Amharic)
const SERVICE_DEPARTMENTS = [
    'የትምህርት ክፍል',           // Education
    'የመዝሙር ክፍል',             // Choir (Mezmur)
    'የአባልነት ጉዳይ ክፍል',       // Member Affairs
    'የልማት ክፍል',              // Development
    'የሙያና አገልግሎት ክፍል',      // Profession and Service
    'የባች ማስተባበር ክፍል',       // Batch Coordination
    'የሳንሱር እና ፕሮግራም ዝግጅት ክፍል', // Censorship and Program Preparation
    'የፋይናንስና ንብረት ክፍል',    // Finance and Property
    'የኦዲት እና ቁጥጥር ክፍል',    // Audit and Inspection
];

// Leadership members to seed
const LEADERSHIP = [
    // A. Secretariat Members
    {
        full_name: 'Kibrom Abebe',
        email: 'kibrom.abebe@endaeyesus.local',
        role: 'SECRETARIAT_CHAIRMAN',
        department: null,
    },
    {
        full_name: 'Dn. Tesfahun Nigus',
        email: 'tesfahun.nigus@endaeyesus.local',
        role: 'SECRETARIAT_VICE',
        department: null,
    },
    {
        full_name: 'Sister Tigist Gebru',
        email: 'tigist.gebru@endaeyesus.local',
        role: 'SECRETARIAT_SECRETARY',
        department: null,
    },

    // B. Service Department Heads
    {
        full_name: 'Dn. Nahom G/Medhin',
        email: 'nahom.gmedhin@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የትምህርት ክፍል',
    },
    {
        full_name: 'Rediet Tsegay',
        email: 'rediet.tsegay@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የመዝሙር ክፍል',
    },
    {
        full_name: 'Dn. Tewodros Beyene',
        email: 'tewodros.beyene@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የአባልነት ጉዳይ ክፍል',
    },
    {
        full_name: 'Dn. Kibrom G/Selassie',
        email: 'kibrom.gselassie@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የልማት ክፍል',
    },
    {
        full_name: 'Henok Elias',
        email: 'henok.elias@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የሙያና አገልግሎት ክፍል',
    },
    {
        full_name: 'Yirga Getachew',
        email: 'yirga.getachew@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የባች ማስተባበር ክፍል',
    },
    {
        full_name: 'Aklil G/Egziabher',
        email: 'aklil.gegziabher@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የሳንሱር እና ፕሮግራም ዝግጅት ክፍል',
    },
    {
        full_name: 'Masho Hadush',
        email: 'masho.hadush@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የፋይናንስና ንብረት ክፍል',
    },
    {
        full_name: 'Abel Guesh',
        email: 'abel.guesh@endaeyesus.local',
        role: 'SERVICE_MANAGER',
        department: 'የኦዲት እና ቁጥጥር ክፍል',
    },
];

async function main() {
    console.log('=== Enda Eyesus Leadership Seeding Script ===\n');

    // Step 1: Create all service departments
    console.log('Step 1: Creating service departments...');
    const classMap = {};
    for (const deptName of SERVICE_DEPARTMENTS) {
        const existing = await prisma.serviceClass.findUnique({
            where: { class_name_amharic: deptName },
        });
        if (existing) {
            classMap[deptName] = existing.id;
            console.log(`  [EXISTS] ${deptName}`);
        } else {
            const created = await prisma.serviceClass.create({
                data: { class_name_amharic: deptName },
            });
            classMap[deptName] = created.id;
            console.log(`  [CREATED] ${deptName}`);
        }
    }

    // Step 2: Create leadership accounts
    console.log('\nStep 2: Creating leadership accounts...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

    for (const member of LEADERSHIP) {
        const existing = await prisma.user.findUnique({
            where: { email: member.email },
        });

        if (existing) {
            // Update role and service class if needed
            const updateData = { system_role: member.role };
            if (member.department && classMap[member.department]) {
                updateData.service_class_id = classMap[member.department];
            }
            await prisma.user.update({
                where: { id: existing.id },
                data: updateData,
            });
            console.log(`  [UPDATED] ${member.full_name} -> ${member.role} ${member.department ? '(' + member.department + ')' : ''}`);
        } else {
            const data = {
                full_name_three_parts: member.full_name,
                email: member.email,
                password_hash: passwordHash,
                system_role: member.role,
            };
            if (member.department && classMap[member.department]) {
                data.service_class_id = classMap[member.department];
            }
            await prisma.user.create({ data });
            console.log(`  [CREATED] ${member.full_name} -> ${member.role} ${member.department ? '(' + member.department + ')' : ''}`);
        }
    }

    // Step 3: Update existing chairman if it's the old admin@endaeyesus.com
    const oldChairman = await prisma.user.findUnique({
        where: { email: 'admin@endaeyesus.com' },
    });
    if (oldChairman) {
        await prisma.user.update({
            where: { id: oldChairman.id },
            data: {
                full_name_three_parts: 'Kibrom Abebe',
                system_role: 'SECRETARIAT_CHAIRMAN',
            },
        });
        console.log('\n  [FIXED] Updated admin@endaeyesus.com -> Kibrom Abebe (SECRETARIAT_CHAIRMAN)');
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`\nAll accounts use default password: ${DEFAULT_PASSWORD}`);
    console.log('\nLogin credentials:');
    for (const m of LEADERSHIP) {
        console.log(`  ${m.full_name.padEnd(30)} | ${m.email.padEnd(45)} | ${m.role}`);
    }
    console.log(`\n  (Also: admin@endaeyesus.com with password SecretChairman123!)`);
}

main()
    .catch((e) => {
        console.error('Seeding error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
