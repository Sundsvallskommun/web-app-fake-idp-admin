import { CreateGroupDto, UpdateGroupDto } from '@dtos/group.dto';
import prisma from '@utils/prisma';

/**
 * Medlemmarna följer med varje grupp: adminlistan visar sambandet grupp →
 * testidentitet direkt, utan ett extra anrop per rad. Bara de fält listan
 * faktiskt visar väljs — lösenord och attribut hör inte hemma här.
 */
const withDetails = {
  include: {
    _count: { select: { users: true } },
    users: { select: { id: true, name: true, username: true }, orderBy: { name: 'asc' as const } },
    applications: {
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' as const },
    },
  },
} as const;

const toGroup = <T extends { _count: { users: number } }>(group: T) => {
  const { _count, ...data } = group;
  return { ...data, userCount: _count.users };
};

export class GroupsService {
  public async getGroups() {
    const groups = await prisma.group.findMany({ ...withDetails, orderBy: { name: 'asc' } });
    return groups.map(toGroup);
  }

  public async getGroup(id: number) {
    const group = await prisma.group.findUnique({ where: { id }, ...withDetails });
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
      data: {
        name: data.name.trim(),
        description: data.description.trim(),
        ...(data.applicationIds === undefined
          ? {}
          : { applications: { connect: data.applicationIds.map(applicationId => ({ id: applicationId })) } }),
      },
      ...withDetails,
    });
    return toGroup(group);
  }

  public async updateGroup(id: number, data: UpdateGroupDto) {
    const group = await prisma.group.update({
      where: { id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name.trim() }),
        ...(data.description === undefined ? {} : { description: data.description.trim() }),
        ...(data.applicationIds === undefined ? {} : { applications: { set: data.applicationIds.map(applicationId => ({ id: applicationId })) } }),
      },
      ...withDetails,
    });
    return toGroup(group);
  }

  public removeGroup(id: number) {
    return prisma.group.delete({ where: { id } });
  }
}
