import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import prisma from '@utils/prisma';

const withAttributes = { include: { attributes: true } } as const;

export class UsersService {
  public getUsers() {
    return prisma.user.findMany({ ...withAttributes, orderBy: { name: 'asc' } });
  }

  public getUser(id: string) {
    return prisma.user.findUnique({ where: { id }, ...withAttributes });
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

  public updateUser(id: string, data: UpdateUserDto) {
    return prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        username: data.username,
        password: data.password,
        // Replace the attribute set wholesale when provided.
        ...(data.attributes ?
          { attributes: { deleteMany: {}, create: data.attributes.map(attributeData) } }
        : {}),
      },
      ...withAttributes,
    });
  }

  public removeUser(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

const attributeData = (attribute: { key: string; format: string; value: string; type: string }) => ({
  key: attribute.key,
  format: attribute.format,
  value: attribute.value,
  type: attribute.type,
});
