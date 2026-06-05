import { HttpException } from '@/exceptions/HttpException';
import { RequestWithUser } from '@/interfaces/auth.interface';
import { ClientUser } from '@/interfaces/users.interface';
import { AdminUserListResponse, AdminUserResponse, UserApiResponse } from '@/responses/user.response';
import { CreateUserDto, UpdateUserDto } from '@dtos/user.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { UsersService } from '@services/users.service';
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
    return response.send({ data, message: 'success' });
  }

  @Get('/users/:id')
  @OpenAPI({ summary: 'Return a single fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async getUser(@Param('id') id: string, @Res() response: any) {
    const data = await this.users.getUser(id);
    if (!data) {
      throw new HttpException(404, 'User not found');
    }
    return response.send({ data, message: 'success' });
  }

  @Post('/users')
  @OpenAPI({ summary: 'Create a fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async createUser(@Body() body: CreateUserDto, @Res() response: any) {
    const data = await this.users.createUser(body);
    return response.send({ data, message: 'success' });
  }

  @Put('/users/:id')
  @OpenAPI({ summary: 'Update a fake-IdP user' })
  @ResponseSchema(AdminUserResponse)
  async updateUser(@Param('id') id: string, @Body() body: UpdateUserDto, @Res() response: any) {
    if (!(await this.users.getUser(id))) {
      throw new HttpException(404, 'User not found');
    }
    const data = await this.users.updateUser(id, body);
    return response.send({ data, message: 'success' });
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
