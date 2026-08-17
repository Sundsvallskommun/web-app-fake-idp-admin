import 'reflect-metadata';
import { Request } from 'express';
import { UserController } from './user.controller';

describe('UserController admin session', () => {
  it('returns the configured admin operator from the admin session', async () => {
    const request = {
      session: {
        adminUser: { name: 'Local Admin', username: 'admin' },
      },
    } as unknown as Request;
    const response = { send: jest.fn() };

    await new UserController().getMe(request, response);

    expect(response.send).toHaveBeenCalledWith({
      data: { name: 'Local Admin', username: 'admin' },
      message: 'success',
    });
  });
});
