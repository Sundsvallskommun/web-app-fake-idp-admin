import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';

const prisma = new PrismaClient();

// SAML attribute metadata, matching the seed users.
const SAML_FORMAT = 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic';
const XS_STRING = 'xs:string';

/**
 * The attribute set a user needs for the self-referential SAML login to succeed.
 * The SP's verify callback (backend/src/app.ts) requires givenName, surname and
 * citizenIdentifier, and reads username; passport-saml maps these from the
 * assertion by attribute key. Admin-group gating is currently commented out, so
 * `groups` is not required for panel access — it's included for forward-compat
 * and so the user reads as an admin on the IdP details page.
 */
const adminAttributes = (username: string): Record<string, string> => ({
  givenName: 'Admin',
  surname: 'User',
  citizenIdentifier: '199001011234',
  username,
  groups: 'admin',
});

const toAttributeRows = (attributes: Record<string, string>) =>
  Object.entries(attributes).map(([key, value]) => ({ key, format: SAML_FORMAT, value, type: XS_STRING }));

/** Prompt for a single line of input. */
function question(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve =>
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    }),
  );
}

/** Prompt without echoing the typed characters (for the password). */
function hiddenQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  // readline writes every keystroke via _writeToOutput; suppress it once the
  // prompt itself has been written so the password isn't echoed to the terminal.
  const internal = rl as unknown as { _writeToOutput: (s: string) => void };
  let muted = false;
  internal._writeToOutput = (stringToWrite: string) => {
    if (!muted) process.stdout.write(stringToWrite);
  };
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const usernameInput = (await question('Username [admin]: ')).trim();
  const username = usernameInput || 'admin';

  const password = await hiddenQuestion('Password: ');
  if (!password) {
    console.error('Password is required — aborting.');
    process.exitCode = 1;
    return;
  }

  // username is not unique in the schema, so match the first existing one.
  const existing = await prisma.user.findFirst({ where: { username } });

  if (existing) {
    const confirm = (await question(`User "${username}" already exists. Update its password? (y/N): `)).trim().toLowerCase();
    if (confirm !== 'y' && confirm !== 'yes') {
      console.log('Aborted — no changes made.');
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { password } });
    console.log(`Updated password for existing user "${username}" (id ${existing.id}).`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: 'Admin',
      username,
      password,
      attributes: { create: toAttributeRows(adminAttributes(username)) },
    },
  });
  console.log(`Created admin user "${username}" (id ${user.id}).`);
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
