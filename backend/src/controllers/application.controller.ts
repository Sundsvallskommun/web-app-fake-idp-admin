import { HttpException } from '@/exceptions/HttpException';
import { AdminApplicationListResponse, AdminApplicationResponse } from '@/responses/application.response';
import { CreateApplicationDto, UpdateApplicationDto } from '@dtos/application.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { ApplicationsService } from '@services/applications.service';
import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller('/applications')
@UseBefore(authMiddleware)
export class ApplicationController {
  private applications = new ApplicationsService();

  @Get()
  @OpenAPI({ summary: 'List connected test applications' })
  @ResponseSchema(AdminApplicationListResponse)
  async getApplications(@Res() response: any) {
    return response.send({ data: await this.applications.getApplications(), message: 'success' });
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return a connected test application' })
  @ResponseSchema(AdminApplicationResponse)
  async getApplication(@Param('id') id: number, @Res() response: any) {
    const application = await this.applications.getApplication(id);
    if (!application) {
      throw new HttpException(404, 'Application not found');
    }
    return response.send({ data: application, message: 'success' });
  }

  @Post()
  @OpenAPI({ summary: 'Create a connected test application' })
  @ResponseSchema(AdminApplicationResponse)
  async createApplication(@Body() body: CreateApplicationDto, @Res() response: any) {
    const name = body.name.trim();
    if (!name) {
      throw new HttpException(400, 'Application name is required');
    }
    if (await this.applications.getApplicationByName(name)) {
      throw new HttpException(409, 'Application name already exists');
    }
    return response.send({ data: await this.applications.createApplication({ ...body, name }), message: 'success' });
  }

  @Put('/:id')
  @OpenAPI({ summary: 'Update a connected test application' })
  @ResponseSchema(AdminApplicationResponse)
  async updateApplication(@Param('id') id: number, @Body() body: UpdateApplicationDto, @Res() response: any) {
    const existing = await this.applications.getApplication(id);
    if (!existing) {
      throw new HttpException(404, 'Application not found');
    }
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        throw new HttpException(400, 'Application name is required');
      }
      const duplicate = await this.applications.getApplicationByName(name);
      if (duplicate && duplicate.id !== id) {
        throw new HttpException(409, 'Application name already exists');
      }
      body = { ...body, name };
    }
    return response.send({ data: await this.applications.updateApplication(id, body), message: 'success' });
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Delete a connected test application and its memberships' })
  @ResponseSchema(AdminApplicationResponse)
  async removeApplication(@Param('id') id: number, @Res() response: any) {
    if (!(await this.applications.getApplication(id))) {
      throw new HttpException(404, 'Application not found');
    }
    await this.applications.removeApplication(id);
    return response.send({ data: { id }, message: 'success' });
  }
}
