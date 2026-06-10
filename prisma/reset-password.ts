import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'kibrom.abebe@endaeyesus.local';
  const newPassword = '123456'; // temporary simple password
  const hash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: { email },
    data: { password_hash: hash },
  });
  console.log(`Password for ${user.email} reset to "${newPassword}"`);
}

main().catch(console.error).finally(() => prisma.$disconnect());