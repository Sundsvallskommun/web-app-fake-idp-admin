import { ADMIN_DISPLAY_NAME, ADMIN_PASSWORD, ADMIN_USERNAME } from '@config';
import { ClientUser } from '@interfaces/users.interface';
import { createHash, timingSafeEqual } from 'crypto';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

const matches = (value: string, expected: string): boolean => timingSafeEqual(digest(value), digest(expected));

export class AdminAuthService {
  authenticate(username: string, password: string): ClientUser | null {
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !ADMIN_DISPLAY_NAME) {
      return null;
    }

    const usernameMatches = matches(username, ADMIN_USERNAME);
    const passwordMatches = matches(password, ADMIN_PASSWORD);
    if (!usernameMatches || !passwordMatches) {
      return null;
    }

    return {
      name: ADMIN_DISPLAY_NAME,
      username: ADMIN_USERNAME,
    };
  }
}
