vi.mock('@config', () => ({
  ADMIN_DISPLAY_NAME: 'Local Admin',
  ADMIN_PASSWORD: 'correct-password',
  ADMIN_USERNAME: 'admin',
}));

import { AdminAuthService } from './admin-auth.service';

describe('AdminAuthService', () => {
  const service = new AdminAuthService();

  it('returns the configured operator without exposing its password', () => {
    expect(service.authenticate('admin', 'correct-password')).toEqual({
      name: 'Local Admin',
      username: 'admin',
    });
  });

  it.each([
    ['wrong username', 'other', 'correct-password'],
    ['wrong password', 'admin', 'wrong-password'],
  ])('rejects %s', (_case, username, password) => {
    expect(service.authenticate(username, password)).toBeNull();
  });
});
