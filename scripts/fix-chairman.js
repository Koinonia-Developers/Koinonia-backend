const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function fix() {
    try {
        const user = await prisma.user.findFirst({ where: { system_role: 'SECRETARIAT_CHAIRMAN' } });
        if (!user) {
            console.log('NO CHAIRMAN FOUND — creating one...');
            const hash = await bcrypt.hash('SecretChairman123!', 12);
            const created = await prisma.user.create({
                data: {
                    email: 'chairman@endaeyesus.local',
                    full_name_three_parts: 'System Chairman Root',
                    password_hash: hash,
                    system_role: 'SECRETARIAT_CHAIRMAN',
                },
            });
            console.log('Created chairman:', created.email);
            return;
        }

        console.log('Chairman found:', user.email);
        console.log('Hash prefix:', user.password_hash.substring(0, 10) + '...');

        const pw = 'SecretChairman123!';
        const match = await bcrypt.compare(pw, user.password_hash);
        console.log('Password match:', match);

        if (!match) {
            console.log('Hash mismatch — re-hashing password...');
            const newHash = await bcrypt.hash(pw, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { password_hash: newHash },
            });
            const verify = await bcrypt.compare(pw, newHash);
            console.log('Verification after fix:', verify);
            console.log('Done! You can now log in with chairman@endaeyesus.local / SecretChairman123!');
        } else {
            console.log('Password is correct! Check auth service logic instead.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

fix();
