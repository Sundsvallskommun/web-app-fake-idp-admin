import 'reflect-metadata';
import { MASKED_VALUE } from '@utils/mask-user';
import { UsersService } from '@services/users.service';
import { Request } from 'express';
import { UserController } from './user.controller';

const storedUser: NonNullable<Awaited<ReturnType<UsersService['getUser']>>> = {
  id: 'test-user',
  name: 'Test Testsson',
  username: 'testte01',
  password: 'secret',
  attributes: [
    {
      id: 1,
      userId: 'test-user',
      key: 'citizenIdentifier',
      format: 'urn:oasis:names:tc:SAML:2.0:attrname-format:uri',
      value: '199001011234',
      type: 'xs:string',
    },
  ],
  groups: [],
  applications: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('UserController admin session', () => {
  it('returns the configured admin operator from the admin session', async () => {
    const request = {
      session: {
        adminUser: { name: 'Local Admin', username: 'admin' },
      },
    } as unknown as Request;
    const response = { send: vi.fn() };

    await new UserController().getMe(request, response);

    expect(response.send).toHaveBeenCalledWith({
      data: { name: 'Local Admin', username: 'admin' },
      message: 'success',
    });
  });
});

describe('UserController citizen identifier', () => {
  it('keeps the citizen identifier masked in the regular user response', async () => {
    vi.spyOn(UsersService.prototype, 'getUser').mockResolvedValue(storedUser);
    const response = { send: vi.fn() };

    await new UserController().getUser(storedUser.id, response);

    expect(response.send).toHaveBeenCalledWith({
      data: {
        ...storedUser,
        attributes: [{ ...storedUser.attributes[0], value: MASKED_VALUE }],
      },
      message: 'success',
    });
  });

  it('reveals the citizen identifier explicitly and prevents caching', async () => {
    vi.spyOn(UsersService.prototype, 'getUser').mockResolvedValue(storedUser);
    const response = { send: vi.fn(), setHeader: vi.fn() };

    await new UserController().getCitizenIdentifier(storedUser.id, response);

    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(response.send).toHaveBeenCalledWith({
      data: { value: '199001011234' },
      message: 'success',
    });
  });

  it('returns 404 when the user does not exist', async () => {
    vi.spyOn(UsersService.prototype, 'getUser').mockResolvedValue(null);

    await expect(new UserController().getCitizenIdentifier('missing', { send: vi.fn() })).rejects.toMatchObject({
      status: 404,
      message: 'User not found',
    });
  });
});
