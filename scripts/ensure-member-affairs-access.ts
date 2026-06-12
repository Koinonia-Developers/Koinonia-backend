/**
 * Ensures Member Affairs access is properly configured
 * Usage: npx ts-node scripts/ensure-member-affairs-access.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Configuring Member Affairs access...\n');

    // Step 1: Ensure Member Affairs service class exists
    let memberAffairsClass = await prisma.serviceClass.findUnique({
        where: { class_name_amharic: 'የአባልነት ጉዳይ ክፍል' }
    });

    if (!memberAffairsClass) {
        console.log('📍 Creating Member Affairs service class...');
        memberAffairsClass = await prisma.serviceClass.create({
            data: { class_name_amharic: 'የአባልነት ጉዳይ ክፍል' }
        });
    }
    console.log(`✅ Member Affairs class exists: ${memberAffairsClass.id}\n`);

    // Step 2: Ensure Member Affairs SERVICE_MANAGER exists
    const memberAffairsManager = {
        email: 'tewodros.beyene@endaeyesus.local',
        name: 'Dn. Tewodros Beyene',
        role: 'SERVICE_MANAGER' as const,
    };

    let user = await prisma.user.findUnique({
        where: { email: memberAffairsManager.email }
    });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('MemberAffairs123!', salt);

    if (!user) {
        console.log(`📍 Creating Member Affairs manager: ${memberAffairsManager.email}`);
        user = await prisma.user.create({
            data: {
                full_name_three_parts: memberAffairsManager.name,
                email: memberAffairsManager.email,
                password_hash: passwordHash,
                system_role: memberAffairsManager.role,
                service_class_id: memberAffairsClass.id,
                sex: 'MALE',
                clerical_rank: 'NONE',
                phone_number: '0912345678',
                profile_image_url: '/assets/avatar.png',
            },
            include: { service_classes: true }
        });
        console.log(`✅ Created Member Affairs manager\n`);
    } else {
        console.log(`📍 Updating Member Affairs manager: ${memberAffairsManager.email}`);
        user = await prisma.user.update({
            where: { id: user.id },
            data: {
                system_role: memberAffairsManager.role,
                service_class_id: memberAffairsClass.id,
                password_hash: passwordHash,
            },
            include: { service_classes: true }
        });
        console.log(`✅ Updated Member Affairs manager\n`);
    }

    // Step 3: Summary
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Member Affairs Access Configured');
    console.log('═══════════════════════════════════════════════');
    console.log(`
📧 Email:    ${memberAffairsManager.email}
🔐 Password: MemberAffairs123!
👤 Role:    SERVICE_MANAGER
🏢 Dept:    ${memberAffairsClass.class_name_amharic}

To test member-affairs endpoints:
1. Login with the above credentials
2. Access endpoints like:
   - GET /api/v1/member-affairs/members
   - GET /api/v1/member-affairs/sub-classes/:serviceClassId
   - POST /api/v1/member-affairs/pending
`);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
