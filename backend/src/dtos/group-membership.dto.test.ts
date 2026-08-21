import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateGroupDto } from './group.dto';
import { CreateUserDto } from './user.dto';

describe('group API contracts', () => {
  it('rejects commas because the public SAML claim uses commas as separators', async () => {
    const dto = Object.assign(new CreateGroupDto(), { name: 'editor,reviewer', description: '' });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'name')).toBe(true);
  });

  it('rejects duplicate user-to-group memberships', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      name: 'Test Person',
      username: 'test.person',
      password: 'secret',
      groupIds: [7, 7],
    });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'groupIds')).toBe(true);
  });

  it('keeps validating the deprecated direct application adapter', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      name: 'Test Person',
      username: 'test.person',
      password: 'secret',
      applicationIds: [3, 3],
    });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'applicationIds')).toBe(true);
  });

  it('rejects duplicate group-to-application mappings', async () => {
    const dto = Object.assign(new CreateGroupDto(), {
      name: 'editor',
      description: '',
      applicationIds: [3, 3],
    });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'applicationIds')).toBe(true);
  });
});
