import vm from 'vm';

export type ImportAttribute = { format?: string; value?: string; type?: string };
export type ImportUser = {
  id?: string;
  name: string;
  username: string;
  password: string;
  attributes?: Record<string, ImportAttribute>;
};

/**
 * Parse the raw text of an uploaded `users.js` and return its `users` array.
 *
 * The file is evaluated in a throwaway vm context with a stub `module`/`exports`
 * and no access to `require`/`process`/`globalThis`, plus a 1s timeout. This is a
 * local fake-IdP admin tool sitting behind auth, so executing the uploaded module
 * is an accepted trade-off (the seed format is JS, not JSON); the sandbox limits
 * the blast radius. Supports `module.exports = { users }`, `module.exports = [...]`,
 * and a top-level `users` variable assigned onto exports.
 */
export function parseUsersModule(source: string): ImportUser[] {
  const sandboxModule = { exports: {} as Record<string, unknown> };
  const sandbox = { module: sandboxModule, exports: sandboxModule.exports };

  try {
    vm.runInNewContext(source, sandbox, { timeout: 1000 });
  } catch (err) {
    throw new Error(`could not evaluate users file: ${(err as Error).message}`);
  }

  const exported = sandboxModule.exports as { users?: unknown } | unknown[];
  const users = Array.isArray(exported) ? exported : exported?.users;

  if (!Array.isArray(users)) {
    throw new Error('users file must export an array or `{ users: [...] }`');
  }

  users.forEach((user, index) => {
    if (
      !user ||
      typeof user.name !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.password !== 'string'
    ) {
      throw new Error(`user at index ${index} is missing a string name/username/password`);
    }
  });

  return users as ImportUser[];
}
