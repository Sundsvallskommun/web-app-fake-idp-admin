import { HttpException } from '@/exceptions/HttpException';
import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import { Prisma } from '@prisma/client';
import prisma from '@utils/prisma';
import { groupNamesFromAttributes, withoutGroupAttributes } from '@utils/group-claim';
import { isMaskedAttributeKey, MASKED_VALUE } from '@utils/mask-user';
import { ParsedUserImport } from '@/user-store/user-backup';

const withDetails = {
  include: {
    attributes: true,
    groups: {
      include: { applications: { orderBy: { name: 'asc' as const } } },
      orderBy: { name: 'asc' as const },
    },
    legacyApplicationAccess: {
      select: { application: true },
    },
  },
} as const;

type UserDetails = Prisma.UserGetPayload<typeof withDetails>;

type ApplicationSummary = { id: number; name: string; description: string };

export const applicationsForUser = (
  groups: Array<{ applications: ApplicationSummary[] }>,
  legacyApplicationAccess: Array<{ application: ApplicationSummary }>,
): ApplicationSummary[] =>
  [
    ...new Map(
      [...groups.flatMap(group => group.applications), ...legacyApplicationAccess.map(access => access.application)].map(application => [
        application.id,
        application,
      ]),
    ).values(),
  ].sort((left, right) => left.name.localeCompare(right.name, 'sv'));

/** Application access is the canonical group projection plus persisted legacy
 * assignments that have not been deliberately reclassified yet. */
const toUser = (user: UserDetails) => {
  const applications = applicationsForUser(user.groups, user.legacyApplicationAccess);

  return {
    id: user.id,
    name: user.name,
    username: user.username,
    password: user.password,
    requirePassword: user.requirePassword,
    attributes: user.attributes,
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
 * Preserve only the part of an imported per-user application set that is not
 * already supplied by the current canonical group mappings. A users.js import
 * never invents group mappings because the per-user projection contains no
 * provenance for deciding which group should own an application.
 */
export const legacyApplicationsForImport = (
  users: ImportedAccess[],
  groups: Array<{ name: string; applications: Array<{ name: string }> }>,
): Array<string[] | undefined> => {
  const applicationsByGroup = new Map(groups.map(group => [group.name, new Set(group.applications.map(application => application.name))]));

  return users.map(user => {
    if (user.applicationNames === undefined) return undefined;

    const expected = new Set(user.applicationNames);
    const derived = new Set(user.groupNames.flatMap(groupName => [...(applicationsByGroup.get(groupName) ?? [])]));
    const unexpected = [...derived].filter(applicationName => !expected.has(applicationName));
    if (unexpected.length > 0) {
      throw new UnrepresentableApplicationAccessError(
        `Application assignments for user "${user.username}" conflict with existing group mappings: ${unexpected.join(', ')}`,
      );
    }

    return [...expected].filter(applicationName => !derived.has(applicationName));
  });
};

export class UsersService {
  public async getUsers() {
    const users = await prisma.user.findMany({ ...withDetails, orderBy: { name: 'asc' } });
    return users.map(toUser);
  }

  /** Full persistence projection for versioned backups. Compatibility access
   * stays internal and is never added to the regular admin or SAML response. */
  public async getUsersForBackup() {
    const users = await prisma.user.findMany({ ...withDetails, orderBy: { name: 'asc' } });
    return users.map(user => ({
      ...toUser(user),
      legacyApplications: user.legacyApplicationAccess
        .map(access => access.application)
        .sort((left, right) => left.name.localeCompare(right.name, 'sv')),
    }));
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
    if (data.requirePassword && !data.password) {
      throw new HttpException(400, 'Ange ett lösenord när lösenordskravet är aktiverat.');
    }
    const submittedAttributes = data.attributes ?? [];
    const legacyGroups = groupNamesFromAttributes(submittedAttributes);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password ?? '',
        requirePassword: data.requirePassword ?? false,
        attributes: { create: withoutGroupAttributes(submittedAttributes).map(attributeData) },
        groups:
          data.groupIds !== undefined
            ? { connect: data.groupIds.map(id => ({ id })) }
            : { connectOrCreate: legacyGroups.names.map(name => ({ where: { name }, create: { name } })) },
        ...(data.applicationIds === undefined
          ? {}
          : {
              legacyApplicationAccess: {
                create: data.applicationIds.map(applicationId => ({ application: { connect: { id: applicationId } } })),
              },
            }),
      },
      ...withDetails,
    });
    return toUser(user);
  }

  public async updateUser(id: string, data: UpdateUserDto) {
    if (data.requirePassword !== undefined || data.password !== undefined) {
      const current = await this.getUser(id);
      if (!current) throw new HttpException(404, 'User not found');
      if ((data.requirePassword ?? current.requirePassword) && !(data.password ?? current.password)) {
        throw new HttpException(400, 'Ange ett lösenord när lösenordskravet är aktiverat.');
      }
    }
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
        requirePassword: data.requirePassword,
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
        ...(data.applicationIds === undefined
          ? {}
          : {
              legacyApplicationAccess: {
                deleteMany: {},
                create: data.applicationIds.map(applicationId => ({ application: { connect: { id: applicationId } } })),
              },
            }),
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

  /** Replace the complete store from a validated import document. Versioned
   * backups replace both catalogues; legacy users.js retains documented entries
   * and adds names found in the file. The whole operation is one transaction. */
  public replaceAllUsers(document: ParsedUserImport) {
    return prisma.$transaction(
      async tx => {
        // Clearing users cascades to attributes and disconnects memberships.
        await tx.user.deleteMany();

        if (document.replacesGroupCatalog) {
          await tx.group.deleteMany();
        }

        if (document.replacesApplicationCatalog) {
          await tx.application.deleteMany();
          for (const application of document.applications) await tx.application.create({ data: application });
        } else {
          for (const application of document.applications) {
            await tx.application.upsert({ where: { name: application.name }, create: application, update: {} });
          }
        }

        if (document.replacesGroupCatalog) {
          for (const group of document.groups) {
            await tx.group.create({
              data: {
                name: group.name,
                description: group.description,
                applications: { connect: group.applications.map(name => ({ name })) },
              },
            });
          }
        } else {
          for (const group of document.groups) {
            await tx.group.upsert({
              where: { name: group.name },
              create: { name: group.name, description: group.description },
              update: {},
            });
          }
        }

        const importedGroupNames = [...new Set(document.users.flatMap(user => user.groups))];
        const importedGroups = await tx.group.findMany({
          where: { name: { in: importedGroupNames } },
          select: { name: true, applications: { select: { name: true } } },
        });
        const legacyApplicationsByUser =
          document.format !== 'legacy-users-js'
            ? document.users.map(user => user.legacyApplications ?? [])
            : legacyApplicationsForImport(
                document.users.map(user => ({
                  username: user.username,
                  groupNames: user.groups,
                  applicationNames: user.applications,
                })),
                importedGroups,
              );

        for (const [index, user] of document.users.entries()) {
          const legacyApplicationNames = legacyApplicationsByUser[index];
          await tx.user.create({
            data: {
              ...(user.id ? { id: user.id } : {}),
              name: user.name,
              username: user.username,
              password: user.password,
              requirePassword: user.requirePassword,
              attributes: { create: user.attributes },
              groups: { connect: user.groups.map(name => ({ name })) },
              ...(legacyApplicationNames === undefined
                ? {}
                : {
                    legacyApplicationAccess: {
                      create: legacyApplicationNames.map(name => ({ application: { connect: { name } } })),
                    },
                  }),
            },
          });
        }
        return document.users.length;
      },
      // Large imports use sequential writes to keep replacement reviewable and atomic.
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
