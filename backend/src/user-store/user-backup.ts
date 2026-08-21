import type { Node } from 'acorn';
import { parse } from 'acorn';

export const USER_BACKUP_SCHEMA_VERSION = 1 as const;

export type BackupAttribute = {
  key: string;
  format: string;
  value: string;
  type: string;
};

export type BackupGroup = {
  name: string;
  description: string;
};

export type BackupApplication = {
  name: string;
  description: string;
};

export type BackupUser = {
  id?: string;
  name: string;
  username: string;
  password: string;
  attributes: BackupAttribute[];
  groups: string[];
  applications: string[];
};

export type UserBackup = {
  schemaVersion: typeof USER_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  groups: BackupGroup[];
  applications: BackupApplication[];
  users: BackupUser[];
};

export type ParsedUserImport = {
  format: 'backup-v1' | 'legacy-users-js';
  replacesGroupCatalog: boolean;
  replacesApplicationCatalog: boolean;
  groups: BackupGroup[];
  applications: BackupApplication[];
  users: BackupUser[];
  warnings: string[];
};

type StoredUser = {
  id: string;
  name: string;
  username: string;
  password: string;
  attributes: BackupAttribute[];
  groups: Array<{ name: string }>;
  applications: Array<{ name: string }>;
};

type StoredGroup = {
  name: string;
  description: string;
};

type StoredApplication = {
  name: string;
  description: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

const requiredString = (record: Record<string, unknown>, key: string, context: string): string => {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(`${context}.${key} must be a string`);
  }
  return value;
};

const optionalString = (record: Record<string, unknown>, key: string, context: string): string | undefined => {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${context}.${key} must be a string when present`);
  }
  return value;
};

const stringArray = (value: unknown, context: string): string[] => {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error(`${context} must be an array of strings`);
  }
  return value as string[];
};

const parseAttribute = (value: unknown, context: string): BackupAttribute => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  return {
    key: requiredString(value, 'key', context),
    format: requiredString(value, 'format', context),
    value: requiredString(value, 'value', context),
    type: requiredString(value, 'type', context),
  };
};

const parseGroup = (value: unknown, context: string): BackupGroup => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  const name = requiredString(value, 'name', context).trim();
  if (!name) throw new Error(`${context}.name must not be empty`);
  if (name.includes(',')) throw new Error(`${context}.name must not contain commas`);
  return { name, description: requiredString(value, 'description', context) };
};

const parseApplication = (value: unknown, context: string): BackupApplication => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  const name = requiredString(value, 'name', context).trim();
  if (!name) throw new Error(`${context}.name must not be empty`);
  return { name, description: requiredString(value, 'description', context) };
};

const parseBackupUser = (value: unknown, context: string): BackupUser => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  const id = requiredString(value, 'id', context).trim();
  if (!id) throw new Error(`${context}.id must not be empty`);
  if (!Array.isArray(value.attributes)) throw new Error(`${context}.attributes must be an array`);
  return {
    id,
    name: requiredString(value, 'name', context),
    username: requiredString(value, 'username', context),
    password: requiredString(value, 'password', context),
    attributes: value.attributes.map((attribute, index) => parseAttribute(attribute, `${context}.attributes[${index}]`)),
    groups: stringArray(value.groups, `${context}.groups`)
      .map(name => name.trim())
      .filter(Boolean),
    applications: stringArray(value.applications, `${context}.applications`)
      .map(name => name.trim())
      .filter(Boolean),
  };
};

const validateUnique = (values: string[], context: string): void => {
  const duplicate = values.find((value, index) => values.indexOf(value) !== index);
  if (duplicate !== undefined) throw new Error(`${context} contains duplicate value "${duplicate}"`);
};

const parseBackup = (value: Record<string, unknown>): ParsedUserImport => {
  if (value.schemaVersion !== USER_BACKUP_SCHEMA_VERSION) {
    throw new Error(`unsupported backup schema version: ${String(value.schemaVersion)}`);
  }
  if (typeof value.exportedAt !== 'string' || Number.isNaN(Date.parse(value.exportedAt))) {
    throw new Error('backup.exportedAt must be an ISO date string');
  }
  if (!Array.isArray(value.groups)) throw new Error('backup.groups must be an array');
  if (!Array.isArray(value.applications)) throw new Error('backup.applications must be an array');
  if (!Array.isArray(value.users)) throw new Error('backup.users must be an array');

  const groups = value.groups.map((group, index) => parseGroup(group, `backup.groups[${index}]`));
  const applications = value.applications.map((application, index) => parseApplication(application, `backup.applications[${index}]`));
  const users = value.users.map((user, index) => parseBackupUser(user, `backup.users[${index}]`));
  validateUnique(
    groups.map(group => group.name),
    'backup group names',
  );
  validateUnique(
    applications.map(application => application.name),
    'backup application names',
  );
  validateUnique(
    users.map(user => user.id as string),
    'backup user ids',
  );

  const groupNames = new Set(groups.map(group => group.name));
  const applicationNames = new Set(applications.map(application => application.name));
  users.forEach((user, userIndex) => {
    validateUnique(user.groups, `backup.users[${userIndex}].groups`);
    user.groups.forEach(groupName => {
      if (!groupNames.has(groupName)) {
        throw new Error(`backup.users[${userIndex}] references unknown group "${groupName}"`);
      }
    });
    validateUnique(user.applications, `backup.users[${userIndex}].applications`);
    user.applications.forEach(applicationName => {
      if (!applicationNames.has(applicationName)) {
        throw new Error(`backup.users[${userIndex}] references unknown application "${applicationName}"`);
      }
    });
  });

  return {
    format: 'backup-v1',
    replacesGroupCatalog: true,
    replacesApplicationCatalog: true,
    groups,
    applications,
    users,
    warnings: credentialWarnings(users),
  };
};

const propertyName = (node: Node): string => {
  if (node.type === 'Identifier') return (node as Node & { name: string }).name;
  if (node.type === 'Literal') {
    const value = (node as Node & { value?: unknown }).value;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
  }
  throw new Error('legacy users.js contains an unsupported object key');
};

const literalValue = (node: Node, bindings: Map<string, unknown>): unknown => {
  switch (node.type) {
    case 'Literal': {
      const value = (node as Node & { value?: unknown }).value;
      if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value;
      throw new Error('legacy users.js contains an unsupported literal');
    }
    case 'Identifier': {
      const name = (node as Node & { name: string }).name;
      if (name === 'undefined') return undefined;
      if (bindings.has(name)) return bindings.get(name);
      throw new Error(`legacy users.js references unsupported identifier "${name}"`);
    }
    case 'ArrayExpression': {
      const elements = (node as Node & { elements: Array<Node | null> }).elements;
      if (elements.some(element => element === null)) throw new Error('legacy users.js array holes are not supported');
      return elements.map(element => literalValue(element as Node, bindings));
    }
    case 'ObjectExpression': {
      const properties = (node as Node & { properties: Node[] }).properties;
      return Object.fromEntries(
        properties.map(property => {
          if (property.type !== 'Property') throw new Error('legacy users.js spread properties are not supported');
          const entry = property as Node & { computed: boolean; key: Node; kind: string; method: boolean; value: Node };
          if (entry.computed || entry.kind !== 'init' || entry.method) {
            throw new Error('legacy users.js contains an unsupported property');
          }
          return [propertyName(entry.key), literalValue(entry.value, bindings)];
        }),
      );
    }
    case 'UnaryExpression': {
      const expression = node as Node & { operator: string; argument: Node };
      const argument = literalValue(expression.argument, bindings);
      if (expression.operator === '-' && typeof argument === 'number') return -argument;
      if (expression.operator === '+' && typeof argument === 'number') return argument;
      if (expression.operator === '!' && typeof argument === 'boolean') return !argument;
      throw new Error('legacy users.js contains an unsupported unary expression');
    }
    case 'TemplateLiteral': {
      const template = node as Node & { expressions: Node[]; quasis: Array<{ value: { cooked: string | null } }> };
      if (template.expressions.length > 0 || template.quasis.length !== 1 || template.quasis[0].value.cooked === null) {
        throw new Error('legacy users.js template expressions are not supported');
      }
      return template.quasis[0].value.cooked;
    }
    default:
      throw new Error(`legacy users.js contains executable or unsupported syntax (${node.type})`);
  }
};

const isModuleExports = (node: Node): boolean => {
  if (node.type !== 'MemberExpression') return false;
  const member = node as Node & { computed: boolean; object: Node; property: Node };
  return (
    member.object.type === 'Identifier' && (member.object as Node & { name: string }).name === 'module' && propertyName(member.property) === 'exports'
  );
};

const isExportsUsers = (node: Node): boolean => {
  if (node.type !== 'MemberExpression') return false;
  const member = node as Node & { object: Node; property: Node };
  return (
    member.object.type === 'Identifier' && (member.object as Node & { name: string }).name === 'exports' && propertyName(member.property) === 'users'
  );
};

const parseLegacyModuleValue = (source: string): unknown => {
  let program: ReturnType<typeof parse>;
  try {
    program = parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch (error) {
    throw new Error(`could not parse legacy users.js: ${(error as Error).message}`);
  }

  const bindings = new Map<string, unknown>();
  let exported: unknown;

  for (const statement of program.body) {
    if (statement.type === 'VariableDeclaration') {
      const declaration = statement as typeof statement & { declarations: Array<{ id: Node; init: Node | null }> };
      for (const item of declaration.declarations) {
        if (item.id.type !== 'Identifier' || item.init === null) {
          throw new Error('legacy users.js only supports initialized identifier declarations');
        }
        bindings.set((item.id as Node & { name: string }).name, literalValue(item.init, bindings));
      }
      continue;
    }

    if (statement.type === 'ExpressionStatement') {
      const expression = (statement as typeof statement & { expression: Node }).expression;
      if (expression.type !== 'AssignmentExpression') {
        throw new Error('legacy users.js contains executable or unsupported statements');
      }
      const assignment = expression as Node & { operator: string; left: Node; right: Node };
      if (assignment.operator !== '=') throw new Error('legacy users.js only supports direct assignments');
      if (isModuleExports(assignment.left)) exported = literalValue(assignment.right, bindings);
      else if (isExportsUsers(assignment.left)) exported = { users: literalValue(assignment.right, bindings) };
      else throw new Error('legacy users.js contains an unsupported assignment');
      continue;
    }

    throw new Error('legacy users.js contains executable or unsupported statements');
  }

  return exported ?? (bindings.has('users') ? { users: bindings.get('users') } : undefined);
};

const parseLegacyAttribute = (key: string, value: unknown, context: string): BackupAttribute => {
  if (!isRecord(value)) throw new Error(`${context} must be an object`);
  return {
    key,
    format: optionalString(value, 'format', context) ?? '',
    value: optionalString(value, 'value', context) ?? '',
    type: optionalString(value, 'type', context) ?? '',
  };
};

const parseGroupNames = (value: string): string[] => [
  ...new Set(
    value
      .split(',')
      .map(name => name.trim())
      .filter(Boolean),
  ),
];

const parseLegacy = (value: unknown): ParsedUserImport => {
  const exportedUsers = Array.isArray(value) ? value : isRecord(value) ? value.users : undefined;
  if (!Array.isArray(exportedUsers)) throw new Error('legacy users.js must export an array or `{ users: [...] }`');

  const warnings: string[] = ['Legacyformat: katalogbeskrivningar och tomma grupper/applikationer ingår inte. Befintliga kataloger behålls.'];
  const seenIds = new Set<string>();
  const users = exportedUsers.map((rawUser, index): BackupUser => {
    const context = `legacy users[${index}]`;
    if (!isRecord(rawUser)) throw new Error(`${context} must be an object`);
    const rawId = optionalString(rawUser, 'id', context)?.trim();
    let id = rawId || undefined;
    if (id && seenIds.has(id)) {
      warnings.push(`Dubblett-ID "${id}" på rad ${index + 1} ersätts med ett nytt ID vid import.`);
      id = undefined;
    }
    if (id) seenIds.add(id);

    const rawAttributes = rawUser.attributes ?? {};
    if (!isRecord(rawAttributes)) throw new Error(`${context}.attributes must be an object`);
    const attributes = Object.entries(rawAttributes).map(([key, attribute]) => parseLegacyAttribute(key, attribute, `${context}.attributes.${key}`));
    const groupNames = attributes.filter(attribute => attribute.key === 'groups').flatMap(attribute => parseGroupNames(attribute.value));
    const applications = rawUser.applications === undefined ? [] : stringArray(rawUser.applications, `${context}.applications`);

    return {
      id,
      name: requiredString(rawUser, 'name', context),
      username: requiredString(rawUser, 'username', context),
      password: requiredString(rawUser, 'password', context),
      attributes: attributes.filter(attribute => attribute.key !== 'groups'),
      groups: [...new Set(groupNames)],
      applications: [...new Set(applications.map(name => name.trim()).filter(Boolean))],
    };
  });

  const groupNames = [...new Set(users.flatMap(user => user.groups))].sort((left, right) => left.localeCompare(right));
  const applicationNames = [...new Set(users.flatMap(user => user.applications))].sort((left, right) => left.localeCompare(right));
  return {
    format: 'legacy-users-js',
    replacesGroupCatalog: false,
    replacesApplicationCatalog: false,
    groups: groupNames.map(name => ({ name, description: '' })),
    applications: applicationNames.map(name => ({ name, description: '' })),
    users,
    warnings: [...warnings, ...credentialWarnings(users)],
  };
};

const credentialWarnings = (users: BackupUser[]): string[] => {
  const credentials = new Map<string, number>();
  const warnings: string[] = [];
  users.forEach(user => {
    const key = `${user.username}\u0000${user.password}`;
    const count = (credentials.get(key) ?? 0) + 1;
    credentials.set(key, count);
    if (count === 2) warnings.push(`Flera användare har samma inloggningsuppgifter för "${user.username}".`);
  });
  return warnings;
};

export const createUserBackup = (
  users: StoredUser[],
  groups: StoredGroup[],
  applications: StoredApplication[],
  exportedAt = new Date(),
): UserBackup => ({
  schemaVersion: USER_BACKUP_SCHEMA_VERSION,
  exportedAt: exportedAt.toISOString(),
  groups: groups.map(group => ({ name: group.name, description: group.description })).sort((left, right) => left.name.localeCompare(right.name)),
  applications: applications
    .map(application => ({ name: application.name, description: application.description }))
    .sort((left, right) => left.name.localeCompare(right.name)),
  users: users
    .map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      password: user.password,
      attributes: user.attributes.map(({ key, format, value, type }) => ({ key, format, value, type })),
      groups: user.groups.map(group => group.name).sort((left, right) => left.localeCompare(right)),
      applications: user.applications.map(application => application.name).sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => (left.id as string).localeCompare(right.id as string)),
});

export const serializeUserBackup = (backup: UserBackup): string => `${JSON.stringify(backup, null, 2)}\n`;

export const userBackupFingerprint = (backup: UserBackup): string =>
  JSON.stringify({ groups: backup.groups, applications: backup.applications, users: backup.users });

export const parseUserImport = (source: string): ParsedUserImport => {
  let json: unknown;
  try {
    json = JSON.parse(source);
  } catch {
    return parseLegacy(parseLegacyModuleValue(source));
  }

  if (isRecord(json) && 'schemaVersion' in json) return parseBackup(json);
  return parseLegacy(json);
};
