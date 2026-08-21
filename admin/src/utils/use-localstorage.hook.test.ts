import { beforeEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from './use-localstorage.hook';

describe('admin store lifecycle', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useLocalStorage.setState({ headers: {}, resourceData: {} });
  });

  it('persists table preferences but not API data', () => {
    useLocalStorage.getState().setHeaders({ users: ['username'] });
    useLocalStorage.getState().setData('users', [{ id: 'user-1', name: 'Test' }]);

    const persisted = JSON.parse(sessionStorage.getItem('undefined-admin-store') ?? '{}');
    expect(persisted.state.headers).toEqual({ users: ['username'] });
    expect(persisted.state.resourceData).toEqual({});
  });

  it('clears API data without deleting preferences', () => {
    useLocalStorage.getState().setHeaders({ groups: ['name'] });
    useLocalStorage.getState().setData('groups', [{ id: 1, name: 'editors' }]);
    useLocalStorage.getState().resetResourceData();

    expect(useLocalStorage.getState()).toMatchObject({ headers: { groups: ['name'] }, resourceData: {} });
  });
});
