import { HttpException } from '@/exceptions/HttpException';
import { ClientUser } from '@/interfaces/users.interface';
import { AdminUserListResponse, AdminUserResponse, CitizenIdentifierResponse, ImportUsersResponse, UserApiResponse } from '@/responses/user.response';
import { CreateUserDto, ImportUsersDto, UpdateUserDto } from '@dtos/user.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { ApplicationsService } from '@services/applications.service';
import { GroupsService } from '@services/groups.service';
import { UnrepresentableApplicationAccessError, UsersService } from '@services/users.service';
import { CITIZEN_IDENTIFIER_KEY, maskUser } from '@utils/mask-user';
import { ImportUser, parseUsersModule } from '@utils/parse-users-module';
import { serializeUsersModule } from '@utils/serialize-users-module';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';
import { Request } from 'express';

@Controller()
@UseBefore(authMiddleware)
export class UserController {
  private users = new UsersService();
  private groups = new GroupsService();
  private applications = new ApplicationsService();

  private async validateGroups(groupIds?: number[]) {
    if (groupIds !== undefined && !(await this.groups.containsAll(groupIds))) {
      throw new HttpException(400, 'One or more groups do not exist');
    }
  }

  private async validateApplications(applicationIds?: number[]) {
    if (applicationIds !== undefined && !(await this.applications.containsAll(applicationIds))) {
      throw new HttpException(400, 'One or more applications do not exist');
    }
  }

  @Get('/me')
  @OpenAPI({ summary: 'Return current user' })
  @ResponseSchema(UserApiResponse)
  async getMe(@Req() req: Request, @Res() response: any): Promise<ClientUser> {
    const { name, username, defaultCredentials } = req.session.adminUser;

    if (!name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: ClientUser = {
      name: name,
      username: username,
      defaultCredentials: defaultCredentials,
    };

    return response.send({ data: userData, message: 'success' });
  }

  @Get('/users')
  @OpenAPI({ summary: 'List all fake-IdP users' })
  @ResponseSchema(AdminUserListResponse)
  async getUsers(@Res() response: any) {
    const data = await this.users.getUsers();
    return response.send({ data: data.map(maskUser), message: 'success' });
  }

  // Must be declared BEFORE `getUser` (`/users/:id`): GET routes match in declaration
  // order, so `:id` would otherwise capture the literal "export".
  @Get('/users/export')
  @OpenAPI({ summary: 'Export all fake-IdP users as a users.js module' })
  async exportUsers(@Res() response: any) {
    // Intentionally bypasses `maskUser` (unlike the other user responses): the export is a
    // faithful, re-importable backup, so it carries the real attribute values. See
    // serialize-users-module.ts.
    const data = await this.users.getUsers();
    const file = serializeUsersModule(data);
    response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    response.setHeader('Content-Disposition', 'attachment; filename="exported_users.js"');
    return response.send(file);
  }

  // This is the only regular admin response that intentionally returns the
  // sensitive attribute in clear text. Authentication is applied at controller level.
  @Get('/users/:id/citizen-identifier')
  @OpenAPI({ summary: 'Reveal the citizen identifier for a fake-IdP user' })
  @ResponseSchema(CitizenIdentifierResponse)
  async getCitizenIdentifier(@Param('id') id: string, @Res() response: any) {
    const user = await this.users.getUser(id);
    if (!user) {
      throw new HttpException(404, 'User not found');
    }

    const value = user.attributes.find(attribute => attribute.key === CITIZEN_IDENTIFIER_KEY)?.value ?? '';
    response.setHeader('Cache-Control', 'no-store');
    return response.send({ data: { value }, message: 'success' });
  }

  @Get('/users/:id')
  @OpenAPI({ summary: 'Return a single fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async getUser(@Param('id') id: string, @Res() response: any) {
    const data = await this.users.getUser(id);
    if (!data) {
      throw new HttpException(404, 'User not found');
    }
    return response.send({ data: maskUser(data), message: 'success' });
  }

  @Post('/users')
  @OpenAPI({ summary: 'Create a fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async createUser(@Body() body: CreateUserDto, @Res() response: any) {
    await this.validateGroups(body.groupIds);
    await this.validateApplications(body.applicationIds);
    const data = await this.users.createUser(body);
    return response.send({ data: maskUser(data), message: 'success' });
  }

  @Post('/users/import')
  @OpenAPI({ summary: 'Replace all users with the contents of an uploaded users.js file' })
  @ResponseSchema(ImportUsersResponse)
  async importUsers(@Body() body: ImportUsersDto, @Res() response: any) {
    let users: ImportUser[];
    try {
      users = parseUsersModule(body.content);
    } catch (err) {
      throw new HttpException(400, (err as Error).message);
    }
    let imported: number;
    try {
      imported = await this.users.replaceAllUsers(users);
    } catch (error) {
      if (error instanceof UnrepresentableApplicationAccessError) {
        throw new HttpException(400, error.message);
      }
      throw error;
    }
    return response.send({ data: { imported }, message: 'success' });
  }

  @Put('/users/:id')
  @OpenAPI({ summary: 'Update a fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto, @Res() response: any) {
    if (!(await this.users.getUser(id))) {
      throw new HttpException(404, 'User not found');
    }
    await this.validateGroups(body.groupIds);
    await this.validateApplications(body.applicationIds);
    const data = await this.users.updateUser(id, body);
    return response.send({ data: maskUser(data), message: 'success' });
  }

  @Delete('/users/:id')
  @OpenAPI({ summary: 'Delete a fake-IdP user' })
  async removeUser(@Param('id') id: string, @Res() response: any) {
    if (!(await this.users.getUser(id))) {
      throw new HttpException(404, 'User not found');
    }
    await this.users.removeUser(id);
    return response.send({ data: { id }, message: 'success' });
  }
}
