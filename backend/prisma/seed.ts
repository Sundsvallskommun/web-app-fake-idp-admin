import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

type SeedAttribute = { format?: string; value?: string; type?: string };
type SeedUser = {
  id?: string;
  name: string;
  username: string;
  password: string;
  attributes?: Record<string, SeedAttribute>;
};

// The fake-IdP seed data lives as a CommonJS module at the repo root.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { users } = require(path.join(__dirname, '../../users.js')) as { users: SeedUser[] };

async function main() {
  // Idempotent reseed: clearing users cascades to their attributes.
  await prisma.user.deleteMany();

  for (const user of users) {
    const attributes = user.attributes ?? {};
    // Source `id`s are unreliable (duplicates in the test data), so we let the
    // DB assign a fresh cuid and import every user without dropping any.
    await prisma.user.create({
      data: {
        name: user.name,
        username: user.username,
        password: user.password,
        attributes: {
          create: Object.entries(attributes).map(([key, attr]) => ({
            key,
            format: attr.format ?? '',
            value: attr.value ?? '',
            type: attr.type ?? '',
          })),
        },
      },
    });
  }

  console.log(`Seeded ${users.length} users.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
