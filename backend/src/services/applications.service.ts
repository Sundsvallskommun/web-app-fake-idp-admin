import { CreateApplicationDto, UpdateApplicationDto } from '@dtos/application.dto';
import prisma from '@utils/prisma';

const withUserCount = {
  include: { _count: { select: { users: true } } },
} as const;

const toApplication = <T extends { _count: { users: number } }>(application: T) => {
  const { _count, ...data } = application;
  return { ...data, userCount: _count.users };
};

export class ApplicationsService {
  public async getApplications() {
    const applications = await prisma.application.findMany({ ...withUserCount, orderBy: { name: 'asc' } });
    return applications.map(toApplication);
  }

  public async getApplication(id: number) {
    const application = await prisma.application.findUnique({ where: { id }, ...withUserCount });
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
      ...withUserCount,
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
      ...withUserCount,
    });
    return toApplication(application);
  }

  public removeApplication(id: number) {
    return prisma.application.delete({ where: { id } });
  }
}
