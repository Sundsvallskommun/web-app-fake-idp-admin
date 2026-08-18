import { CreateApplicationDto, UpdateApplicationDto } from '@dtos/application.dto';
import prisma from '@utils/prisma';

/** Samma medlemslista som grupperna — se kommentaren i groups.service.ts. */
const withUsers = {
  include: {
    _count: { select: { users: true } },
    users: { select: { id: true, name: true, username: true }, orderBy: { name: 'asc' as const } },
  },
} as const;

const toApplication = <T extends { _count: { users: number } }>(application: T) => {
  const { _count, ...data } = application;
  return { ...data, userCount: _count.users };
};

export class ApplicationsService {
  public async getApplications() {
    const applications = await prisma.application.findMany({ ...withUsers, orderBy: { name: 'asc' } });
    return applications.map(toApplication);
  }

  public async getApplication(id: number) {
    const application = await prisma.application.findUnique({ where: { id }, ...withUsers });
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
      ...withUsers,
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
      ...withUsers,
    });
    return toApplication(application);
  }

  public removeApplication(id: number) {
    return prisma.application.delete({ where: { id } });
  }
}
