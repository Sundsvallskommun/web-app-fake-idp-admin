import { CreateGroupDto, UpdateGroupDto } from '@dtos/group.dto';
import prisma from '@utils/prisma';

const withUserCount = {
  include: { _count: { select: { users: true } } },
} as const;

const toGroup = <T extends { _count: { users: number } }>(group: T) => {
  const { _count, ...data } = group;
  return { ...data, userCount: _count.users };
};

export class GroupsService {
  public async getGroups() {
    const groups = await prisma.group.findMany({ ...withUserCount, orderBy: { name: 'asc' } });
    return groups.map(toGroup);
  }

  public async getGroup(id: number) {
    const group = await prisma.group.findUnique({ where: { id }, ...withUserCount });
    return group && toGroup(group);
  }

  public getGroupByName(name: string) {
    return prisma.group.findUnique({ where: { name } });
  }

  public async containsAll(groupIds: number[]) {
    const uniqueIds = [...new Set(groupIds)];
    return (await prisma.group.count({ where: { id: { in: uniqueIds } } })) === uniqueIds.length;
  }

  public async createGroup(data: CreateGroupDto) {
    const group = await prisma.group.create({
      data: { name: data.name.trim(), description: data.description.trim() },
      ...withUserCount,
    });
    return toGroup(group);
  }

  public async updateGroup(id: number, data: UpdateGroupDto) {
    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name.trim() }),
        ...(data.description === undefined ? {} : { description: data.description.trim() }),
      },
      ...withUserCount,
    });
    return toGroup(group);
  }

  public removeGroup(id: number) {
    return prisma.group.delete({ where: { id } });
  }
}
