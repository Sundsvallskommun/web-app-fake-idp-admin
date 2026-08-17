import { LoginAdminDto } from '@dtos/admin-auth.dto';
import { HttpException } from '@exceptions/HttpException';
import { UserApiResponse } from '@/responses/user.response';
import { AdminAuthService } from '@services/admin-auth.service';
import { Request } from 'express';
import { Body, Controller, Post, Req, Res } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

const regenerateSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate(error => (error ? reject(error) : resolve()));
  });

const saveSession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.save(error => (error ? reject(error) : resolve()));
  });

const destroySession = (req: Request): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.destroy(error => (error ? reject(error) : resolve()));
  });

@Controller('/admin-auth')
export class AdminAuthController {
  private adminAuth = new AdminAuthService();

  @Post('/login')
  @OpenAPI({ summary: 'Sign in to the admin panel with the configured operator account' })
  @ResponseSchema(UserApiResponse)
  async login(@Body() body: LoginAdminDto, @Req() req: Request, @Res() response: any) {
    const adminUser = this.adminAuth.authenticate(body.username, body.password);
    if (!adminUser) {
      throw new HttpException(401, 'INVALID_CREDENTIALS');
    }

    await regenerateSession(req);
    req.session.adminUser = adminUser;
    await saveSession(req);

    return response.send({ data: adminUser, message: 'success' });
  }

  @Post('/logout')
  @OpenAPI({ summary: 'Sign out from the admin panel' })
  async logout(@Req() req: Request, @Res() response: any) {
    await destroySession(req);
    response.clearCookie('fake-idp-admin.sid');
    return response.send({ data: null, message: 'success' });
  }
}
