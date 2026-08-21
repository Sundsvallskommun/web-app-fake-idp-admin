import { UsersImportPreview } from '@data-contracts/backend/data-contracts';
import { describe, expect, it } from 'vitest';
import { isCompleteRecoveryBackup } from './users-transfer';

const completePreview: UsersImportPreview = {
  confirmationToken: 'token',
  format: 'backup-v1',
  currentUserCount: 2,
  incomingUserCount: 2,
  preservedUserIds: 2,
  generatedUserIds: 0,
  removedUserIds: 0,
  groupCount: 1,
  applicationCount: 1,
  replacesGroupCatalog: true,
  replacesApplicationCatalog: true,
  warnings: [],
};

describe('recovery backup validation', () => {
  it('accepts a versioned backup that restores the complete current state', () => {
    expect(isCompleteRecoveryBackup(completePreview)).toBe(true);
  });

  it.each([
    ['legacy format', { format: 'legacy-users-js' as const }],
    ['missing user id', { preservedUserIds: 1 }],
    ['generated user id', { generatedUserIds: 1 }],
    ['removed user', { removedUserIds: 1 }],
    ['partial user set', { incomingUserCount: 1 }],
    ['retained group catalogue', { replacesGroupCatalog: false }],
    ['retained application catalogue', { replacesApplicationCatalog: false }],
  ])('rejects a recovery point with %s', (_case, override) => {
    expect(isCompleteRecoveryBackup({ ...completePreview, ...override })).toBe(false);
  });
});
