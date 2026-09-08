import { createUserBackup, parseUserImport, serializeUserBackup, USER_BACKUP_SCHEMA_VERSION } from './user-backup';

const storedUser = {
  id: 'stable-subject',
  name: 'Test Person',
  username: 'test.person',
  password: 'test-password',
  requirePassword: true,
  attributes: [
    { key: 'role', value: 'editor', format: 'basic', type: 'xs:string' },
    { key: 'role', value: 'reviewer', format: 'basic', type: 'xs:string' },
  ],
  groups: [{ name: 'editors' }],
  legacyApplications: [{ name: 'legacy-app' }],
};

describe('versioned user backup', () => {
  it('round-trips stable ids, duplicate claims and complete catalogues', () => {
    const source = createUserBackup(
      [storedUser],
      [
        { name: 'editors', description: 'Can edit', applications: [{ name: 'test-app' }] },
        { name: 'empty-group', description: 'Documented but empty', applications: [] },
      ],
      [
        { name: 'test-app', description: 'Assigned application' },
        { name: 'legacy-app', description: 'Legacy direct assignment' },
        { name: 'empty-app', description: 'Documented but empty' },
      ],
      new Date('2026-08-21T10:00:00.000Z'),
    );

    expect(parseUserImport(serializeUserBackup(source))).toMatchObject({
      format: 'backup-v2',
      replacesGroupCatalog: true,
      replacesApplicationCatalog: true,
      groups: [
        { name: 'editors', applications: ['test-app'] },
        { name: 'empty-group', applications: [] },
      ],
      applications: [{ name: 'empty-app' }, { name: 'legacy-app' }, { name: 'test-app' }],
      users: [
        {
          id: 'stable-subject',
          requirePassword: true,
          groups: ['editors'],
          legacyApplications: ['legacy-app'],
          attributes: [
            { key: 'role', value: 'editor' },
            { key: 'role', value: 'reviewer' },
          ],
        },
      ],
    });
  });

  it('imports v1 backups without a password requirement', () => {
    const backup = createUserBackup([{ ...storedUser, groups: [], legacyApplications: [] }], [], []);
    const { requirePassword, ...oldUser } = backup.users[0];
    expect(requirePassword).toBe(true);
    const parsed = parseUserImport(JSON.stringify({ ...backup, schemaVersion: 1, users: [oldUser] }));
    expect(parsed).toMatchObject({ format: 'backup-v1', users: [{ password: storedUser.password, requirePassword: false }] });
  });

  it.each([undefined, null, 'true', 1])('rejects an invalid or missing v2 password flag: %s', requirePassword => {
    const backup = createUserBackup([{ ...storedUser, groups: [], legacyApplications: [] }], [], []);
    expect(() => parseUserImport(JSON.stringify({ ...backup, users: [{ ...backup.users[0], requirePassword }] }))).toThrow(
      'requirePassword must be a boolean',
    );
  });

  it('rejects protected users without a configured password', () => {
    const backup = createUserBackup([{ ...storedUser, password: '', groups: [], legacyApplications: [] }], [], []);
    expect(() => parseUserImport(serializeUserBackup(backup))).toThrow('password must not be empty');
    backup.users[0].requirePassword = false;
    expect(parseUserImport(serializeUserBackup(backup)).users[0].password).toBe('');
  });

  it('rejects unknown schema versions and dangling catalogue references', () => {
    expect(() =>
      parseUserImport(
        JSON.stringify({
          schemaVersion: USER_BACKUP_SCHEMA_VERSION + 1,
          exportedAt: new Date().toISOString(),
          groups: [],
          applications: [],
          users: [],
        }),
      ),
    ).toThrow('unsupported backup schema version');

    const invalid = createUserBackup([storedUser], [{ name: 'editors', description: '', applications: [] }], [], new Date());
    invalid.users[0].legacyApplications = ['missing'];
    expect(() => parseUserImport(serializeUserBackup(invalid))).toThrow('references unknown legacy application');

    invalid.users[0].legacyApplications = [];
    invalid.groups[0].applications = ['missing'];
    expect(() => parseUserImport(serializeUserBackup(invalid))).toThrow('backup.groups[0] references unknown application');
  });
});

describe('legacy users.js import', () => {
  it('parses the established CommonJS shape without executing it', () => {
    const parsed = parseUserImport(`
      const format = 'basic';
      const users = [{
        id: 'legacy-id', name: 'Legacy', username: 'legacy', password: 'secret',
        applications: ['test-app'],
        attributes: {
          givenName: { format, value: 'Legacy', type: 'xs:string' },
          groups: { format, value: 'editor, reviewer', type: 'xs:string' }
        }
      }];
      module.exports = { users };
    `);

    expect(parsed).toMatchObject({
      format: 'legacy-users-js',
      replacesGroupCatalog: false,
      replacesApplicationCatalog: false,
      groups: [{ name: 'editor' }, { name: 'reviewer' }],
      applications: [{ name: 'test-app' }],
      users: [{ id: 'legacy-id', requirePassword: false, groups: ['editor', 'reviewer'], applications: ['test-app'] }],
    });
  });

  it('rejects executable expressions', () => {
    expect(() => parseUserImport('module.exports = { users: getUsers() };')).toThrow('executable or unsupported syntax');
  });

  it('keeps all users while replacing duplicate legacy ids', () => {
    const parsed = parseUserImport(
      JSON.stringify({
        users: [
          { id: 'duplicate', name: 'One', username: 'one', password: 'one', attributes: {} },
          { id: 'duplicate', name: 'Two', username: 'two', password: 'two', attributes: {} },
        ],
      }),
    );
    expect(parsed.users.map(user => user.id)).toEqual(['duplicate', undefined]);
    expect(parsed.warnings).toEqual(expect.arrayContaining([expect.stringContaining('Dubblett-ID')]));
  });

  it('distinguishes omitted legacy application metadata from an explicit empty projection', () => {
    const parsed = parseUserImport(
      JSON.stringify({
        users: [
          { name: 'Missing', username: 'missing', password: 'secret', attributes: {} },
          { name: 'Empty', username: 'empty', password: 'secret', attributes: {}, applications: [] },
        ],
      }),
    );

    expect(parsed.users.map(user => user.applications)).toEqual([undefined, []]);
  });
});
