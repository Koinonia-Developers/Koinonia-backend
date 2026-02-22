const { Client } = require('pg');
require('dotenv').config();

const statements = [
  // ─── Enum Alterations ───────────────────────────────────────────
  // Rename ADMIN → SUPER_ADMIN in Role enum
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')) THEN
      ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'SUPER_ADMIN';
    END IF;
  END $$`,

  // Add PENDING_OFFICE_APPROVAL to Status enum
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PENDING_OFFICE_APPROVAL' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Status')) THEN
      ALTER TYPE "Status" ADD VALUE 'PENDING_OFFICE_APPROVAL';
    END IF;
  END $$`,

  // Create PostTargetType enum
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostTargetType') THEN
      CREATE TYPE "PostTargetType" AS ENUM ('GLOBAL', 'CLASS');
    END IF;
  END $$`,

  // Create ReactionType enum
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReactionType') THEN
      CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'DISLIKE');
    END IF;
  END $$`,

  // ─── Column Additions ────────────────────────────────────────────
  // Add classLeaderOf to users
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "classLeaderOf" UUID REFERENCES "service_classes"("id")`,

  // Add leaderID to service_classes
  `ALTER TABLE "service_classes" ADD COLUMN IF NOT EXISTS "leaderID" UUID`,

  // ─── New Tables ──────────────────────────────────────────────────
  // Posts table
  `CREATE TABLE IF NOT EXISTS "posts" (
    "id"             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "authorID"       UUID NOT NULL REFERENCES "users"("id"),
    "title"          VARCHAR(255) NOT NULL,
    "content"        TEXT NOT NULL,
    "imageURL"       TEXT,
    "targetType"     "PostTargetType" NOT NULL,
    "serviceClassID" UUID REFERENCES "service_classes"("id"),
    "isPinned"       BOOLEAN DEFAULT FALSE NOT NULL,
    "createdAt"      TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt"      TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // Post reactions table (one per user per post, unique)
  `CREATE TABLE IF NOT EXISTS "post_reactions" (
    "id"           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "postID"       UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "userID"       UUID NOT NULL REFERENCES "users"("id"),
    "reactionType" "ReactionType" NOT NULL,
    "createdAt"    TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE ("postID", "userID")
  )`,

  // Comments table
  `CREATE TABLE IF NOT EXISTS "comments" (
    "id"        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "postID"    UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "userID"    UUID NOT NULL REFERENCES "users"("id"),
    "content"   TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
  )`,
];

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('✅ Connected to Neon DB');

  for (let i = 0; i < statements.length; i++) {
    try {
      await client.query(statements[i]);
      console.log(`✅ Statement ${i + 1}/${statements.length} OK`);
    } catch (err) {
      console.error(`❌ Statement ${i + 1} failed:`, err.message);
    }
  }

  await client.end();
  console.log('✅ Migration complete');
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
