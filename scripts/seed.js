const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
require('dotenv').config();

// 12 official service classes (exact names as specified)
const serviceClasses = [
    { name: 'ትምህርት ክፍል', description: 'Education Department' },
    { name: 'መዝሙር ክፍል', description: 'Choir Department' },
    { name: 'ኪነጥበባት ክፍል', description: 'Arts Department' },
    { name: 'ባች እና ማስተባበርያ ክፍል', description: 'Coordination Department' },
    { name: 'ሞያ እና አገልግሎት ክፍል', description: 'Professional Service Department' },
    { name: 'ልማት ክፍል', description: 'Development Department' },
    { name: 'ሒሳብና ንብረት ክፍል', description: 'Finance & Property Department' },
    { name: 'ኦዲት እና ኢንስፔክሽን ክፍል', description: 'Audit & Inspection Department' },
    { name: 'ስልጠና ክፍል', description: 'Training Department' },
    { name: 'አባላት ጉዳይ ክፍል', description: 'Member Affairs Department' },
    { name: 'ፅሕፈት ቤት', description: 'Office — ፅሕፈት ቤት' },
    { name: 'የለኝም', description: 'Unassigned — no service class' },
];

async function runSeed() {
    const client = new Client({
        connectionString: process.env.DIRECT_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to Neon DB');

    const now = new Date();
    let firstClassId = null;

    // Delete any service class NOT in the new 12-class list
    const validNames = serviceClasses.map(c => c.name);
    const placeholders = validNames.map((_, i) => `$${i + 1}`).join(', ');
    await client.query(
        `DELETE FROM "service_classes" WHERE "name" NOT IN (${placeholders})`,
        validNames
    );
    console.log('🗑  Removed stale service classes');

    // Upsert all 12 service classes in order
    for (const cls of serviceClasses) {
        const id = randomUUID();
        const res = await client.query(
            `INSERT INTO "service_classes" ("id", "name", "description", "isActive", "createdAt")
       VALUES ($1, $2, $3, true, $4)
       ON CONFLICT ("name") DO UPDATE SET "description" = EXCLUDED."description"
       RETURNING "id"`,
            [id, cls.name, cls.description, now]
        );
        if (!firstClassId) firstClassId = res.rows[0].id;
        console.log('✅ Class:', cls.name);
    }

    // Get the ፅሕፈት ቤት (class 12) ID for admin
    const officeRes = await client.query(`SELECT "id" FROM "service_classes" WHERE "name" = 'ፅሕፈት ቤት'`);
    const officeClassId = officeRes.rows[0]?.id || firstClassId;

    // Upsert admin user
    const passwordHash = await bcrypt.hash('292929', 12);
    const existingAdmin = await client.query(`SELECT "id" FROM "users" WHERE "email" = 'admin@endaeyesus.com'`);

    if (existingAdmin.rows.length === 0) {
        const adminId = randomUUID();
        await client.query(
            `INSERT INTO "users" (
        "id","username","fullName","sex","department","serviceClassID",
        "email","phoneNumber","academicYear","passwordHash","role","status",
        "createdAt","updatedAt"
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [
                adminId, 'endaeyesus', 'System Administrator', 'MALE', 'Administration', officeClassId,
                'admin@endaeyesus.com', '0911000000', 'GRADUATED',
                passwordHash, 'SUPER_ADMIN', 'ACTIVE', now, now
            ]
        );
        console.log('✅ Admin created: endaeyesus / 292929 — role: SUPER_ADMIN');
    } else {
        // Update role to SUPER_ADMIN and refresh password
        await client.query(
            `UPDATE "users" SET "role" = 'SUPER_ADMIN', "username" = 'endaeyesus', "passwordHash" = $1, "updatedAt" = $2, "serviceClassID" = $3
       WHERE "email" = 'admin@endaeyesus.com'`,
            [passwordHash, now, officeClassId]
        );
        console.log('✅ Admin updated: endaeyesus / 292929 — role: SUPER_ADMIN');
    }

    await client.end();
    console.log('🌱 Seed complete!');
}

runSeed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
