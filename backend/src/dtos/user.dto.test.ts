import 'reflect-metadata';
import { validate } from 'class-validator';
import { CreateUserDto, UpdateUserDto } from './user.dto';

describe.each([CreateUserDto, UpdateUserDto])('per-user password API fields (%s)', Dto => {
  it('allows omitted credentials for a password-free user', async () => {
    const dto = Object.assign(new Dto(), { name: 'Test', username: 'test' });
    expect(await validate(dto)).toEqual([]);
  });

  it.each([null, 'true', 1])('rejects a non-boolean requirement: %s', requirePassword => {
    const dto = Object.assign(new Dto(), { name: 'Test', username: 'test', requirePassword });
    return expect(validate(dto)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ property: 'requirePassword' })]));
  });

  it.each([null, false, 123])('rejects a non-string password: %s', password => {
    const dto = Object.assign(new Dto(), { name: 'Test', username: 'test', password });
    return expect(validate(dto)).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ property: 'password' })]));
  });
});
