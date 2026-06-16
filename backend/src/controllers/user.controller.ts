import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { ClientUser } from '@/interfaces/users.interface';
import { AdminUserListResponse, AdminUserResponse, ImportUsersResponse, UserApiResponse } from '@/responses/user.response';
import { CreateUserDto, ImportUsersDto, UpdateUserDto } from '@dtos/user.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { UsersService } from '@services/users.service';
import { maskUser } from '@utils/mask-user';
import { ImportUser, parseUsersModule } from '@utils/parse-users-module';
import { serializeUsersModule } from '@utils/serialize-users-module';
import { Body, Controller, Delete, Get, Param, Post, Put, Req, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

@Controller()
@UseBefore(authMiddleware)
export class UserController {
  private users = new UsersService();

  @Get('/me')
  @OpenAPI({ summary: 'Return current user' })
  @ResponseSchema(UserApiResponse)
  async getMe(@Req() req: RequestWithUser, @Res() response: any): Promise<ClientUser> {
    const { name, username } = req.user;

    if (!name) {
      throw new HttpException(400, 'Bad Request');
    }

    const userData: ClientUser = {
      name: name,
      username: username,
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
    const imported = await this.users.replaceAllUsers(users);
    return response.send({ data: { imported }, message: 'success' });
  }

  @Put('/users/:id')
  @OpenAPI({ summary: 'Update a fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto, @Res() response: any) {
    if (!(await this.users.getUser(id))) {
      throw new HttpException(404, 'User not found');
    }
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
