import { applicationsFromGroups, deriveApplicationGroups } from './users.service';

describe('user application access', () => {
  it('derives a sorted, unique application list from all groups', () => {
    const draken = { id: 1, name: 'Draken', description: '' };
    const katla = { id: 2, name: 'Katla', description: '' };

    expect(applicationsFromGroups([{ applications: [katla, draken] }, { applications: [draken] }])).toEqual([draken, katla]);
  });
});

describe('derived application access during users.js import', () => {
  it('rebuilds group mappings when they reproduce every user application exactly', () => {
    const mappings = deriveApplicationGroups([
      { username: 'anna', groupNames: ['editors'], applicationNames: ['Draken'] },
      { username: 'berit', groupNames: ['editors', 'reviewers'], applicationNames: ['Draken', 'Katla'] },
      { username: 'cecilia', groupNames: ['reviewers'], applicationNames: ['Katla'] },
    ]);

    expect(mappings).toEqual(
      new Map([
        ['editors', ['Draken']],
        ['reviewers', ['Katla']],
      ]),
    );
  });

  it('leaves existing group mappings untouched for legacy imports without application metadata', () => {
    expect(deriveApplicationGroups([{ username: 'anna', groupNames: ['editors'] }])).toBeUndefined();
  });

  it('rejects direct assignments that group memberships cannot represent', () => {
    expect(() =>
      deriveApplicationGroups([
        { username: 'anna', groupNames: ['editors'], applicationNames: ['Draken'] },
        { username: 'berit', groupNames: ['editors'], applicationNames: [] },
      ]),
    ).toThrow('cannot be represented through the imported group memberships');
  });
});
