//src/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Running system bootstrap script...');

  const chairmanEmail = process.env.INITIAL_CHAIRMAN_EMAIL;
  const chairmanPassword = process.env.INITIAL_CHAIRMAN_PASSWORD;

  if (!chairmanEmail || !chairmanPassword) {
    console.log('Skipping bootstrap: INITIAL_CHAIRMAN_EMAIL or INITIAL_CHAIRMAN_PASSWORD not set.');
    return;
  }

  // Check if Chairman already exists
  const existingChairman = await prisma.user.findFirst({
    where: { system_role: 'SECRETARIAT_CHAIRMAN' },
  });

  if (existingChairman) {
    console.log('A Chairman account already exists. Bootstrapping aborted to prevent duplicate root nodes.');
    return;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(chairmanPassword, salt);

  // Create Chairman account
  const chairman = await prisma.user.create({
    data: {
      email: chairmanEmail,
      full_name_three_parts: 'System Chairman Root',
      password_hash: passwordHash,
      system_role: 'SECRETARIAT_CHAIRMAN',
    },
  });

  console.log('✅ Successfully bootstrapped SECRETARIAT_CHAIRMAN account:');
  console.log(`Email: ${chairman.email}`);
  console.log(`Role:  ${chairman.system_role}`);
}

main()
  .catch((e) => {
    console.error('Error during bootstrapping:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
