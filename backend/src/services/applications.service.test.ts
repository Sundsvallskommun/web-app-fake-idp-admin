import { toApplication } from './applications.service';

describe('application access projection', () => {
  it('returns mapped groups and unique users derived from their memberships', () => {
    const anna = { id: 'u1', name: 'Anna', username: 'anna' };
    const berit = { id: 'u2', name: 'Berit', username: 'berit' };

    expect(
      toApplication({
        id: 1,
        name: 'Draken',
        description: 'Testapp',
        groups: [
          { id: 1, name: 'editors', description: '', _count: { users: 2 }, users: [anna, berit] },
          { id: 2, name: 'reviewers', description: '', _count: { users: 1 }, users: [anna] },
        ],
      }),
    ).toEqual({
      id: 1,
      name: 'Draken',
      description: 'Testapp',
      groups: [
        { id: 1, name: 'editors', description: '', userCount: 2 },
        { id: 2, name: 'reviewers', description: '', userCount: 1 },
      ],
      users: [anna, berit],
      userCount: 2,
    });
  });
});
