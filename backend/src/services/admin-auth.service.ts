import { ADMIN_DISPLAY_NAME, ADMIN_PASSWORD, ADMIN_USERNAME } from '@config';
import { ClientUser } from '@interfaces/users.interface';
import { timingSafeEqual } from 'crypto';

const matches = (value: string, expected: string): boolean => {
  const valueBuffer = Buffer.from(value, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  return valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer);
};

export class AdminAuthService {
  /**
   * Stacken kan frontas av en publik proxy (docker-compose.external-proxy.yml) —
   * kvarstående default-lösenord är då en öppen IdP som utfärdar giltiga
   * SAML-assertions. Flaggan driver startvarningen och bannern i admin-UI:t.
   */
  usesDefaultCredentials(): boolean {
    return ADMIN_PASSWORD === 'admin';
  }

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
      defaultCredentials: this.usesDefaultCredentials(),
    };
  }
}
