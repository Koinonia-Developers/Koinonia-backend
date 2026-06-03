const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
require('dotenv').config();

const serviceClasses = [
    { class_name_amharic: 'ትምህርት ክፍል', is_public_registration: true },
    { class_name_amharic: 'መዝሙር ክፍል', is_public_registration: true },
    { class_name_amharic: 'አባላት ጉዳይ ክፍል', is_public_registration: true },
    { class_name_amharic: 'ልማት ክፍል', is_public_registration: true },
    { class_name_amharic: 'ሒሳብና ንብረት ክፍል', is_public_registration: true },
    { class_name_amharic: 'ሞያና አገልግሎት ክፍል', is_public_registration: true },
    { class_name_amharic: 'የባች ማስተባበሪያ ክፍል', is_public_registration: true },
    { class_name_amharic: 'ሳንሱርና መርሐ ግብር ዝግጅት ክፍል', is_public_registration: true },
    { class_name_amharic: 'ኦዲትና ኢንስፔክሽን ክፍል', is_public_registration: true },
    { class_name_amharic: 'ፅሕፈት ቤት', is_public_registration: false },
    { class_name_amharic: 'የለኝም', is_public_registration: false },
];

async function runSeed() {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DIRECT_URL or DATABASE_URL not specified in environment");
        process.exit(1);
    }
    
    const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const client = new Client({
        connectionString,
        ssl: isLocal ? false : { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to database for seeding');

    const now = new Date();
    let firstClassId = null;

    // Clear and upsert service classes
    const validNames = serviceClasses.map(c => c.class_name_amharic);
    const placeholders = validNames.map((_, i) => `$${i + 1}`).join(', ');
    
    await client.query(
        `DELETE FROM "service_classes" WHERE "class_name_amharic" NOT IN (${placeholders})`,
        validNames
    );
    console.log('🗑  Cleaned stale service classes');

    // Insert classes
    for (const cls of serviceClasses) {
        const id = randomUUID();
        const res = await client.query(
            `INSERT INTO "service_classes" ("id", "class_name_amharic", "is_public_registration", "created_at", "updated_at")
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT ("class_name_amharic") DO UPDATE SET "is_public_registration" = EXCLUDED."is_public_registration"
             RETURNING "id"`,
            [id, cls.class_name_amharic, cls.is_public_registration, now, now]
        );
        if (!firstClassId) firstClassId = res.rows[0].id;
        console.log('✅ Class:', cls.class_name_amharic);
    }

    // Get the ፅሕፈት ቤት ID for admin
    const officeRes = await client.query(`SELECT "id" FROM "service_classes" WHERE "class_name_amharic" = 'ፅሕፈት ቤት'`);
    const officeClassId = officeRes.rows[0]?.id || firstClassId;

    // Upsert admin user
    const passwordHash = await bcrypt.hash('292929', 12);
    const existingAdmin = await client.query(`SELECT "id" FROM "users" WHERE "email" = 'admin@endaeyesus.com'`);

    if (existingAdmin.rows.length === 0) {
        const adminId = randomUUID();
        await client.query(
            `INSERT INTO "users" (
                "id", "full_name_three_parts", "email", "password_hash", "system_role", "service_class_id", "created_at", "updated_at"
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                adminId, 'System Administrator', 'admin@endaeyesus.com', passwordHash, 'SECRETARIAT_CHAIRMAN', officeClassId, now, now
            ]
        );
        console.log('✅ Admin created: admin@endaeyesus.com / 292929 — role: SECRETARIAT_CHAIRMAN');
    } else {
        await client.query(
            `UPDATE "users" SET "system_role" = 'SECRETARIAT_CHAIRMAN', "password_hash" = $1, "updated_at" = $2, "service_class_id" = $3
             WHERE "email" = 'admin@endaeyesus.com'`,
            [passwordHash, now, officeClassId]
        );
        console.log('✅ Admin updated: admin@endaeyesus.com / 292929 — role: SECRETARIAT_CHAIRMAN');
    }

    await client.end();
    console.log('🌱 Seed complete!');
}

runSeed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
