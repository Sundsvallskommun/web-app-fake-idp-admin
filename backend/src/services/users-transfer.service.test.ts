import { ApplicationsService } from '@services/applications.service';
import { GroupsService } from '@services/groups.service';
import { ImportConfirmationError, UsersTransferService } from '@services/users-transfer.service';
import { UsersService } from '@services/users.service';
import { createUserBackup, serializeUserBackup } from '@/user-store/user-backup';

const storedUsers: Awaited<ReturnType<UsersService['getUsersForBackup']>> = [
  {
    id: 'existing-id',
    name: 'Existing',
    username: 'existing',
    password: 'secret',
    requirePassword: false,
    attributes: [],
    groups: [],
    applications: [],
    legacyApplications: [],
  },
];

describe('UsersTransferService', () => {
  beforeEach(() => {
    vi.spyOn(UsersService.prototype, 'getUsersForBackup').mockResolvedValue(storedUsers);
    vi.spyOn(GroupsService.prototype, 'getGroups').mockResolvedValue([]);
    vi.spyOn(ApplicationsService.prototype, 'getApplications').mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('requires the exact preview token for the same content and current state', async () => {
    const transfer = new UsersTransferService();
    const content = serializeUserBackup(createUserBackup(storedUsers, [], [], new Date('2026-08-21T10:00:00.000Z')));
    const preview = await transfer.previewImport(content);
    const replace = vi.spyOn(UsersService.prototype, 'replaceAllUsers').mockResolvedValue(1);

    await expect(transfer.importUsers(content, 'invalid-token')).rejects.toBeInstanceOf(ImportConfirmationError);
    await expect(transfer.importUsers(content, preview.confirmationToken)).resolves.toEqual({ imported: 1, format: 'backup-v2' });
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({ users: [expect.objectContaining({ id: 'existing-id' })] }));
  });

  it('invalidates the preview when the current store changes', async () => {
    const transfer = new UsersTransferService();
    const content = serializeUserBackup(createUserBackup([], [], [], new Date('2026-08-21T10:00:00.000Z')));
    const preview = await transfer.previewImport(content);
    vi.spyOn(UsersService.prototype, 'getUsersForBackup').mockResolvedValueOnce([
      ...storedUsers,
      {
        id: 'new-id',
        name: 'New',
        username: 'new',
        password: 'new',
        requirePassword: false,
        attributes: [],
        groups: [],
        applications: [],
        legacyApplications: [],
      },
    ]);

    await expect(transfer.importUsers(content, preview.confirmationToken)).rejects.toBeInstanceOf(ImportConfirmationError);
  });
});
