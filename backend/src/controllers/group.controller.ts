import { HttpException } from '@/exceptions/HttpException';
import { AdminGroupListResponse, AdminGroupResponse } from '@/responses/group.response';
import { CreateGroupDto, UpdateGroupDto } from '@dtos/group.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { GroupsService } from '@services/groups.service';
import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller('/groups')
@UseBefore(authMiddleware)
export class GroupController {
  private groups = new GroupsService();

  @Get()
  @OpenAPI({ summary: 'List documented SAML groups' })
  @ResponseSchema(AdminGroupListResponse)
  async getGroups(@Res() response: any) {
    return response.send({ data: await this.groups.getGroups(), message: 'success' });
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return a documented SAML group' })
  @ResponseSchema(AdminGroupResponse)
  async getGroup(@Param('id') id: number, @Res() response: any) {
    const group = await this.groups.getGroup(id);
    if (!group) {
      throw new HttpException(404, 'Group not found');
    }
    return response.send({ data: group, message: 'success' });
  }

  @Post()
  @OpenAPI({ summary: 'Create a documented SAML group' })
  @ResponseSchema(AdminGroupResponse)
  async createGroup(@Body() body: CreateGroupDto, @Res() response: any) {
    const name = body.name.trim();
    if (!name) {
      throw new HttpException(400, 'Group name is required');
    }
    if (await this.groups.getGroupByName(name)) {
      throw new HttpException(409, 'Group name already exists');
    }
    return response.send({ data: await this.groups.createGroup({ ...body, name }), message: 'success' });
  }

  @Put('/:id')
  @OpenAPI({ summary: 'Update a documented SAML group' })
  @ResponseSchema(AdminGroupResponse)
  async updateGroup(@Param('id') id: number, @Body() body: UpdateGroupDto, @Res() response: any) {
    const existing = await this.groups.getGroup(id);
    if (!existing) {
      throw new HttpException(404, 'Group not found');
    }
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) {
        throw new HttpException(400, 'Group name is required');
      }
      const duplicate = await this.groups.getGroupByName(name);
      if (duplicate && duplicate.id !== id) {
        throw new HttpException(409, 'Group name already exists');
      }
      body = { ...body, name };
    }
    return response.send({ data: await this.groups.updateGroup(id, body), message: 'success' });
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Delete a documented SAML group and its memberships' })
  async removeGroup(@Param('id') id: number, @Res() response: any) {
    if (!(await this.groups.getGroup(id))) {
      throw new HttpException(404, 'Group not found');
    }
    await this.groups.removeGroup(id);
    return response.send({ data: { id }, message: 'success' });
  }
}
