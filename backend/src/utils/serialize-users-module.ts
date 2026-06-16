import { ImportUser } from '@utils/parse-users-module';

// The shape UsersService returns (a Prisma user with its attribute rows included).
type AttributeRow = { key: string; format: string; value: string; type: string };
type UserWithAttributes = {
  id: string;
  name: string;
  username: string;
  password: string;
  attributes: AttributeRow[];
};

/**
 * Inverse of `parseUsersModule`: serialize the stored users back into the text of a
 * `users.js` module (`const users = [...]; module.exports = { users }`), so the export
 * round-trips through the import. Rebuilds the keyed `attributes` object from the flat
 * attribute rows (the inverse of `replaceAllUsers`'s `Object.entries(attributes)` mapping).
 *
 * The values are emitted as-is (real personnummer + plaintext password) — this produces a
 * faithful, re-importable backup; masking it would make the file lossy. Callers exposing
 * this over HTTP must therefore bypass `maskUser`.
 *
 * JSON.stringify output is valid JS and re-parses cleanly in `parseUsersModule`'s vm; the
 * quote/key style differs cosmetically from the hand-written `users.js` but the data
 * structure is identical.
 */
export function serializeUsersModule(users: UserWithAttributes[]): string {
  const plain: ImportUser[] = users.map(user => ({
    id: user.id,
    name: user.name,
    username: user.username,
    password: user.password,
    attributes: Object.fromEntries(
      user.attributes.map(attribute => [
        attribute.key,
        { format: attribute.format, value: attribute.value, type: attribute.type },
      ]),
    ),
  }));

  return `const users = ${JSON.stringify(plain, null, 2)};\n\nmodule.exports = { users };\n`;
}
