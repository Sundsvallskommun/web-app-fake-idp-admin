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

  it('rejects duplicate memberships', async () => {
    const dto = Object.assign(new CreateUserDto(), {
      name: 'Test Person',
      username: 'test.person',
      password: 'secret',
      groupIds: [7, 7],
    });

    const errors = await validate(dto);

    expect(errors.some(error => error.property === 'groupIds')).toBe(true);
  });
});
