import { UsersService } from '../src/services/users.service';
import { parseUserImport } from '../src/user-store/user-backup';
import prisma from '../src/utils/prisma';
import { readFileSync } from 'fs';
import path from 'path';

const usersFile = path.join(__dirname, '../../users.js');

async function main() {
  // Seed and admin import intentionally share one parser and replacement owner.
  const document = parseUserImport(readFileSync(usersFile, 'utf8'));
  const imported = await new UsersService().replaceAllUsers(document);
  console.log(`Seeded ${imported} users.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
