import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import prisma from '@utils/prisma';
import { groupNamesFromAttributes, withoutGroupAttributes } from '@utils/group-claim';
import { isMaskedAttributeKey, MASKED_VALUE } from '@utils/mask-user';
import { ParsedUserImport } from '@/user-store/user-backup';

const withDetails = {
  include: {
    attributes: true,
    groups: { orderBy: { name: 'asc' as const } },
    applications: { orderBy: { name: 'asc' as const } },
  },
} as const;

export class UsersService {
  public getUsers() {
    return prisma.user.findMany({ ...withDetails, orderBy: { name: 'asc' } });
  }

  public getUser(id: string) {
    return prisma.user.findUnique({ where: { id }, ...withDetails });
  }

  // username is not unique in the schema; callers match the password themselves.
  public getUsersByUsername(username: string) {
    return prisma.user.findMany({ where: { username }, ...withDetails });
  }

  public createUser(data: CreateUserDto) {
    const submittedAttributes = data.attributes ?? [];
    const legacyGroups = groupNamesFromAttributes(submittedAttributes);
    return prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        attributes: { create: withoutGroupAttributes(submittedAttributes).map(attributeData) },
        groups:
          data.groupIds !== undefined
            ? { connect: data.groupIds.map(id => ({ id })) }
            : { connectOrCreate: legacyGroups.names.map(name => ({ where: { name }, create: { name } })) },
        ...(data.applicationIds !== undefined ? { applications: { connect: data.applicationIds.map(id => ({ id })) } } : {}),
      },
      ...withDetails,
    });
  }

  public async updateUser(id: string, data: UpdateUserDto) {
    // The admin UI receives masked values for sensitive attributes (see mask-user.ts).
    // When the edit form submits the mask sentinel back unchanged, restore the stored
    // value so saving the form never clobbers a real personnummer with the mask.
    const submittedAttributes = data.attributes && (await this.unmaskAttributes(id, data.attributes));
    const legacyGroups = submittedAttributes && groupNamesFromAttributes(submittedAttributes);
    const attributes = submittedAttributes && withoutGroupAttributes(submittedAttributes);
    return prisma.user.update({
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
        ...(data.applicationIds !== undefined ? { applications: { set: data.applicationIds.map(applicationId => ({ id: applicationId })) } } : {}),
      },
      ...withDetails,
    });
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
          for (const group of document.groups) await tx.group.create({ data: group });
        } else {
          for (const group of document.groups) {
            await tx.group.upsert({ where: { name: group.name }, create: group, update: {} });
          }
        }

        if (document.replacesApplicationCatalog) {
          await tx.application.deleteMany();
          for (const application of document.applications) await tx.application.create({ data: application });
        } else {
          for (const application of document.applications) {
            await tx.application.upsert({ where: { name: application.name }, create: application, update: {} });
          }
        }

        for (const user of document.users) {
          await tx.user.create({
            data: {
              ...(user.id ? { id: user.id } : {}),
              name: user.name,
              username: user.username,
              password: user.password,
              attributes: { create: user.attributes },
              groups: { connect: user.groups.map(name => ({ name })) },
              applications: { connect: user.applications.map(name => ({ name })) },
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
