import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import prisma from '@utils/prisma';
import { isMaskedAttributeKey, MASKED_VALUE } from '@utils/mask-user';
import { ImportUser } from '@utils/parse-users-module';

const withAttributes = { include: { attributes: true } } as const;

export class UsersService {
  public getUsers() {
    return prisma.user.findMany({ ...withAttributes, orderBy: { name: 'asc' } });
  }

  public getUser(id: string) {
    return prisma.user.findUnique({ where: { id }, ...withAttributes });
  }

  // username is not unique in the schema; callers match the password themselves.
  public getUsersByUsername(username: string) {
    return prisma.user.findMany({ where: { username }, ...withAttributes });
  }

  public createUser(data: CreateUserDto) {
    return prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        attributes: { create: (data.attributes ?? []).map(attributeData) },
      },
      ...withAttributes,
    });
  }

  public async updateUser(id: string, data: UpdateUserDto) {
    // The admin UI receives masked values for sensitive attributes (see mask-user.ts).
    // When the edit form submits the mask sentinel back unchanged, restore the stored
    // value so saving the form never clobbers a real personnummer with the mask.
    const attributes = data.attributes && (await this.unmaskAttributes(id, data.attributes));
    return prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        // Replace the attribute set wholesale when provided.
        ...(attributes ? { attributes: { deleteMany: {}, create: attributes.map(attributeData) } } : {}),
      },
      ...withAttributes,
    });
  }

  private async unmaskAttributes(id: string, attributes: { key: string; format: string; value: string; type: string }[]) {
    if (!attributes.some(attribute => isMaskedAttributeKey(attribute.key) && attribute.value === MASKED_VALUE)) {
      return attributes;
    }
    const existing = await this.getUser(id);
    const storedByKey = new Map(existing?.attributes.map(attribute => [attribute.key, attribute.value]));
    return attributes.map(attribute =>
      isMaskedAttributeKey(attribute.key) && attribute.value === MASKED_VALUE ?
        { ...attribute, value: storedByKey.get(attribute.key) ?? '' }
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
    return prisma.$transaction(
      async tx => {
        // Clearing users cascades to their attributes.
        await tx.user.deleteMany();
        for (const user of users) {
          const attributes = user.attributes ?? {};
          await tx.user.create({
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
