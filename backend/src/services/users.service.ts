import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import { Prisma } from '@prisma/client';
import prisma from '@utils/prisma';
import { groupNamesFromAttributes, withoutGroupAttributes } from '@utils/group-claim';
import { isMaskedAttributeKey, MASKED_VALUE } from '@utils/mask-user';
import { ImportUser } from '@utils/parse-users-module';

const withDetails = {
  include: {
    attributes: true,
    groups: {
      include: { applications: { orderBy: { name: 'asc' as const } } },
      orderBy: { name: 'asc' as const },
    },
  },
} as const;

type UserDetails = Prisma.UserGetPayload<typeof withDetails>;

type ApplicationSummary = { id: number; name: string; description: string };

export const applicationsFromGroups = (groups: Array<{ applications: ApplicationSummary[] }>): ApplicationSummary[] =>
  [...new Map(groups.flatMap(group => group.applications).map(application => [application.id, application])).values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'sv'),
  );

/** Application access is a read-only projection of the user's groups. */
const toUser = (user: UserDetails) => {
  const applications = applicationsFromGroups(user.groups);

  return {
    ...user,
    groups: user.groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
    })),
    applications,
  };
};

type ImportedAccess = {
  username: string;
  groupNames: string[];
  applicationNames?: string[];
};

export class UnrepresentableApplicationAccessError extends Error {}

/**
 * Convert the legacy per-user application metadata in users.js to the canonical
 * group mappings. The conversion is accepted only when it reproduces every
 * user's application set exactly; otherwise importing would silently grant or
 * remove access.
 */
export const deriveApplicationGroups = (users: ImportedAccess[]): Map<string, string[]> | undefined => {
  if (!users.some(user => user.applicationNames !== undefined)) {
    return undefined;
  }

  const membersByGroup = new Map<string, ImportedAccess[]>();
  for (const user of users) {
    for (const groupName of user.groupNames) {
      membersByGroup.set(groupName, [...(membersByGroup.get(groupName) ?? []), user]);
    }
  }

  const applicationsByGroup = new Map<string, string[]>();
  for (const [groupName, members] of membersByGroup) {
    const [first, ...rest] = members;
    const commonApplications = [...new Set(first.applicationNames ?? [])].filter(applicationName =>
      rest.every(member => new Set(member.applicationNames ?? []).has(applicationName)),
    );
    applicationsByGroup.set(groupName, commonApplications);
  }

  for (const user of users) {
    const expected = new Set(user.applicationNames ?? []);
    const derived = new Set(user.groupNames.flatMap(groupName => applicationsByGroup.get(groupName) ?? []));
    if (expected.size !== derived.size || [...expected].some(applicationName => !derived.has(applicationName))) {
      throw new UnrepresentableApplicationAccessError(
        `Application assignments for user "${user.username}" cannot be represented through the imported group memberships`,
      );
    }
  }

  return applicationsByGroup;
};

export class UsersService {
  public async getUsers() {
    const users = await prisma.user.findMany({ ...withDetails, orderBy: { name: 'asc' } });
    return users.map(toUser);
  }

  public async getUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id }, ...withDetails });
    return user && toUser(user);
  }

  // username is not unique in the schema; callers match the password themselves.
  public async getUsersByUsername(username: string) {
    const users = await prisma.user.findMany({ where: { username }, ...withDetails });
    return users.map(toUser);
  }

  public async createUser(data: CreateUserDto) {
    const submittedAttributes = data.attributes ?? [];
    const legacyGroups = groupNamesFromAttributes(submittedAttributes);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        attributes: { create: withoutGroupAttributes(submittedAttributes).map(attributeData) },
        groups:
          data.groupIds !== undefined
            ? { connect: data.groupIds.map(id => ({ id })) }
            : { connectOrCreate: legacyGroups.names.map(name => ({ where: { name }, create: { name } })) },
      },
      ...withDetails,
    });
    return toUser(user);
  }

  public async updateUser(id: string, data: UpdateUserDto) {
    // The admin UI receives masked values for sensitive attributes (see mask-user.ts).
    // When the edit form submits the mask sentinel back unchanged, restore the stored
    // value so saving the form never clobbers a real personnummer with the mask.
    const submittedAttributes = data.attributes && (await this.unmaskAttributes(id, data.attributes));
    const legacyGroups = submittedAttributes && groupNamesFromAttributes(submittedAttributes);
    const attributes = submittedAttributes && withoutGroupAttributes(submittedAttributes);
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        // Replace the attribute set wholesale when provided.
        ...(attributes ? { attributes: { deleteMany: {}, create: attributes.map(attributeData) } } : {}),
        ...(data.groupIds !== undefined
          ? { groups: { set: data.groupIds.map(groupId => ({ id: groupId })) } }
          : legacyGroups?.found
            ? {
                groups: {
                  set: [],
                  connectOrCreate: legacyGroups.names.map(name => ({ where: { name }, create: { name } })),
                },
              }
            : {}),
      },
      ...withDetails,
    });
    return toUser(user);
  }

  private async unmaskAttributes(id: string, attributes: { key: string; format: string; value: string; type: string }[]) {
    if (!attributes.some(attribute => isMaskedAttributeKey(attribute.key) && attribute.value === MASKED_VALUE)) {
      return attributes;
    }
    const existing = await this.getUser(id);
    const storedByKey = new Map(existing?.attributes.map(attribute => [attribute.key, attribute.value]));
    return attributes.map(attribute =>
      isMaskedAttributeKey(attribute.key) && attribute.value === MASKED_VALUE
        ? { ...attribute, value: storedByKey.get(attribute.key) ?? '' }
        : attribute,
    );
  }

  public removeUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }

  /**
   * Replace the entire user store with `users` (parsed from an uploaded
   * users.js). Wraps the wipe + inserts in a transaction so a failure rolls back
   * and never leaves the store half-empty. Mirrors the prisma seed mapping:
   * source `id`s are ignored (the test data has duplicates) and the DB assigns a
   * fresh cuid. Returns the number of users created.
   */
  public replaceAllUsers(users: ImportUser[]) {
    const importedUsers = users.map(user => {
      const attributes = user.attributes ?? {};
      const submittedAttributes = Object.entries(attributes).map(([key, attr]) => ({
        key,
        format: attr.format ?? '',
        value: attr.value ?? '',
        type: attr.type ?? '',
      }));
      return {
        user,
        username: user.username,
        submittedAttributes,
        groupNames: groupNamesFromAttributes(submittedAttributes).names,
        applicationNames: user.applications === undefined ? undefined : [...new Set(user.applications.map(name => name.trim()).filter(Boolean))],
      };
    });
    const applicationsByGroup = deriveApplicationGroups(importedUsers);

    return prisma.$transaction(
      async tx => {
        // Clearing users cascades to their attributes.
        await tx.user.deleteMany();
        for (const imported of importedUsers) {
          const { user, submittedAttributes, groupNames } = imported;
          await tx.user.create({
            data: {
              name: user.name,
              username: user.username,
              password: user.password,
              attributes: {
                create: withoutGroupAttributes(submittedAttributes),
              },
              groups: {
                connectOrCreate: groupNames.map(name => ({ where: { name }, create: { name } })),
              },
            },
          });
        }

        if (applicationsByGroup) {
          const applicationNames = [...new Set([...applicationsByGroup.values()].flat())];
          for (const name of applicationNames) {
            await tx.application.upsert({ where: { name }, create: { name }, update: {} });
          }
          for (const [groupName, names] of applicationsByGroup) {
            await tx.group.update({
              where: { name: groupName },
              data: { applications: { set: names.map(name => ({ name })) } },
            });
          }
        }
        return users.length;
      },
      // Raise the interactive-transaction timeout (default 5s) so importing a
      // large users.js — many sequential inserts — doesn't roll back midway.
      { timeout: 60_000 },
    );
  }
}

const attributeData = (attribute: { key: string; format: string; value: string; type: string }) => ({
  key: attribute.key,
  format: attribute.format,
  value: attribute.value,
  type: attribute.type,
});
