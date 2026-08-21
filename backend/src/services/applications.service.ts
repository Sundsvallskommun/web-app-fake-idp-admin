import { CreateApplicationDto, UpdateApplicationDto } from '@dtos/application.dto';
import prisma from '@utils/prisma';

const withAccess = {
  include: {
    groups: {
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { users: true } },
        users: { select: { id: true, name: true, username: true }, orderBy: { name: 'asc' as const } },
      },
      orderBy: { name: 'asc' as const },
    },
  },
} as const;

type ApplicationWithAccess = {
  id: number;
  name: string;
  description: string;
  groups: Array<{
    id: number;
    name: string;
    description: string;
    _count: { users: number };
    users: Array<{ id: string; name: string; username: string }>;
  }>;
};

export const toApplication = (application: ApplicationWithAccess) => {
  const usersById = new Map(application.groups.flatMap(group => group.users).map(user => [user.id, user]));
  const users = [...usersById.values()].sort((left, right) => left.name.localeCompare(right.name, 'sv'));

  return {
    id: application.id,
    name: application.name,
    description: application.description,
    groups: application.groups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      userCount: group._count.users,
    })),
    users,
    userCount: users.length,
  };
};

export class ApplicationsService {
  public async getApplications() {
    const applications = await prisma.application.findMany({ ...withAccess, orderBy: { name: 'asc' } });
    return applications.map(toApplication);
  }

  public async getApplication(id: number) {
    const application = await prisma.application.findUnique({ where: { id }, ...withAccess });
    return application && toApplication(application);
  }

  public getApplicationByName(name: string) {
    return prisma.application.findUnique({ where: { name } });
  }

  public async containsAll(applicationIds: number[]) {
    const uniqueIds = [...new Set(applicationIds)];
    return (await prisma.application.count({ where: { id: { in: uniqueIds } } })) === uniqueIds.length;
  }

  public async createApplication(data: CreateApplicationDto) {
    const application = await prisma.application.create({
      data: { name: data.name.trim(), description: data.description.trim() },
      ...withAccess,
    });
    return toApplication(application);
  }

  public async updateApplication(id: number, data: UpdateApplicationDto) {
    const application = await prisma.application.update({
      where: { id },
      data: {
        ...(data.name === undefined ? {} : { name: data.name.trim() }),
        ...(data.description === undefined ? {} : { description: data.description.trim() }),
      },
      ...withAccess,
    });
    return toApplication(application);
  }

  public removeApplication(id: number) {
    return prisma.application.delete({ where: { id } });
  }
}
