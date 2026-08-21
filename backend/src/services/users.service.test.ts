import { applicationsForUser, legacyApplicationsForImport } from './users.service';

describe('user application access', () => {
  it('derives a sorted, unique application list from all groups', () => {
    const draken = { id: 1, name: 'Draken', description: '' };
    const katla = { id: 2, name: 'Katla', description: '' };

    expect(applicationsForUser([{ applications: [katla, draken] }, { applications: [draken] }], [{ application: katla }])).toEqual([draken, katla]);
  });
});

describe('legacy application access during users.js import', () => {
  it('stores only access that is not already derived from current group mappings', () => {
    const legacy = legacyApplicationsForImport(
      [{ username: 'anna', groupNames: ['editors'], applicationNames: ['Draken', 'Katla'] }],
      [{ name: 'editors', applications: [{ name: 'Draken' }] }],
    );

    expect(legacy).toEqual([['Katla']]);
  });

  it('does not create legacy assignments when old imports omit application metadata', () => {
    expect(legacyApplicationsForImport([{ username: 'anna', groupNames: ['editors'] }], [])).toEqual([undefined]);
  });

  it('rejects imports whose groups would grant access absent from the imported projection', () => {
    expect(() =>
      legacyApplicationsForImport(
        [{ username: 'anna', groupNames: ['editors'], applicationNames: [] }],
        [{ name: 'editors', applications: [{ name: 'Draken' }] }],
      ),
    ).toThrow('conflict with existing group mappings: Draken');
  });
});
