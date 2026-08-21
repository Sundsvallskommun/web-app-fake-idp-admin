import { parseUsersModule } from './parse-users-module';
import { serializeUsersModule } from './serialize-users-module';

describe('users.js group compatibility', () => {
  it('exports normalized memberships as the established groups claim', () => {
    const source = serializeUsersModule([
      {
        id: 'user-1',
        name: 'Test Person',
        username: 'test.person',
        password: 'test-password',
        attributes: [{ key: 'givenName', value: 'Test', format: 'basic', type: 'xs:string' }],
        groups: [{ name: 'editor' }, { name: 'reviewer' }],
        applications: [{ name: 'draken' }, { name: 'katla' }],
      },
    ]);

    const [user] = parseUsersModule(source);

    expect(user.attributes).toEqual({
      givenName: { value: 'Test', format: 'basic', type: 'xs:string' },
      groups: {
        value: 'editor,reviewer',
        format: 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic',
        type: 'xs:string',
      },
    });
    // Applikationer är inte claims — de åker med som eget fält och överlever
    // export → import.
    expect(user.applications).toEqual(['draken', 'katla']);
  });

  it('exports an explicit empty application set', () => {
    const source = serializeUsersModule([
      {
        id: 'user-1',
        name: 'Test Person',
        username: 'test.person',
        password: 'test-password',
        attributes: [],
        groups: [],
        applications: [],
      },
    ]);

    expect(parseUsersModule(source)[0].applications).toEqual([]);
  });
});
