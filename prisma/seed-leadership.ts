import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'SecretChairman123!';

const ACCOUNTS = [
  // Secretariat
  { email: 'kibrom.abebe@endaeyesus.local', name: 'Kibrom Abebe', role: 'SECRETARIAT_CHAIRMAN', dept: null as string | null },
  { email: 'tesfahun.nigus@endaeyesus.local', name: 'Dn. Tesfahun Nigus', role: 'SECRETARIAT_VICE', dept: null },
  { email: 'tigist.gebru@endaeyesus.local', name: 'Sister Tigist Gebru', role: 'SECRETARIAT_SECRETARY', dept: null },
  // Service Managers
  { email: 'nahom.gmedhin@endaeyesus.local', name: 'Dn. Nahom G/Medhin', role: 'SERVICE_MANAGER', dept: 'የትምህርት ክፍል' },
  { email: 'rediet.tsegay@endaeyesus.local', name: 'Rediet Tsegay', role: 'SERVICE_MANAGER', dept: 'የመዝሙር ክፍል' },
  { email: 'tewodros.beyene@endaeyesus.local', name: 'Dn. Tewodros Beyene', role: 'SERVICE_MANAGER', dept: 'የአባልነት ጉዳይ ክፍል' },
  { email: 'kibrom.gselassie@endaeyesus.local', name: 'Dn. Kibrom G/Selassie', role: 'SERVICE_MANAGER', dept: 'የልማት ክፍል' },
  { email: 'henok.elias@endaeyesus.local', name: 'Henok Elias', role: 'SERVICE_MANAGER', dept: 'የሙያና አገልግሎት ክፍል' },
  { email: 'yirga.getachew@endaeyesus.local', name: 'Yirga Getachew', role: 'SERVICE_MANAGER', dept: 'የባች ማስተባበር ክፍል' },
  { email: 'aklil.gegziabher@endaeyesus.local', name: 'Aklil G/Egziabher', role: 'SERVICE_MANAGER', dept: 'የሳንሱር እና ፕሮግራም ዝግጅት ክፍል' },
  { email: 'masho.hadush@endaeyesus.local', name: 'Masho Hadush', role: 'SERVICE_MANAGER', dept: 'የፋይናንስና ንብረት ክፍል' },
  { email: 'abel.guesh@endaeyesus.local', name: 'Abel Guesh', role: 'SERVICE_MANAGER', dept: 'የኦዲት እና ቁጥጥር ክፍል' },
];

async function main() {
  console.log('🌱 Seeding leadership accounts...');

  // Get unique department names (non-null)
  const deptNames = [...new Set(ACCOUNTS.filter(a => a.dept !== null).map(a => a.dept as string))];
  const classMap = new Map<string, string>();

  for (const deptName of deptNames) {
    let cls = await prisma.serviceClass.findUnique({
      where: { class_name_amharic: deptName }
    });
    if (!cls) {
      console.log(`  Creating service class: ${deptName}`);
      cls = await prisma.serviceClass.create({
        data: { class_name_amharic: deptName }
      });
    }
    classMap.set(deptName, cls.id);
  }

  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, salt);

  for (const acc of ACCOUNTS) {
    const userData: any = {
      full_name_three_parts: acc.name,
      email: acc.email,
      password_hash: passwordHash,
      system_role: acc.role,
      sex: 'MALE',
      clerical_rank: 'NONE',
      phone_number: '0912345678',
      profile_image_url: '/assets/avatar.png',
    };

    if (acc.dept && classMap.has(acc.dept)) {
      userData.service_class_id = classMap.get(acc.dept);
    }

    const existing = await prisma.user.findUnique({
      where: { email: acc.email }
    });

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: userData,
      });
      console.log(`✅ Updated: ${acc.email}`);
    } else {
      await prisma.user.create({ data: userData });
      console.log(`✅ Created: ${acc.email}`);
    }
  }

  console.log(`\n🎉 Seeding completed. Default password for all accounts: ${DEFAULT_PASSWORD}`);
  console.log(`⚠️  Change passwords after first login!`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });