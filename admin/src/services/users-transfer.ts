import { UsersImportPreview } from '@data-contracts/backend/data-contracts';

/**
 * A recovery point is complete only when the backend has parsed it as the
 * versioned format and proved that re-importing it would preserve every current
 * id and both catalogues without generating or removing users.
 */
export const isCompleteRecoveryBackup = (preview: UsersImportPreview): boolean =>
  preview.format === 'backup-v2' &&
  preview.incomingUserCount === preview.currentUserCount &&
  preview.preservedUserIds === preview.currentUserCount &&
  preview.generatedUserIds === 0 &&
  preview.removedUserIds === 0 &&
  preview.replacesGroupCatalog &&
  preview.replacesApplicationCatalog;
