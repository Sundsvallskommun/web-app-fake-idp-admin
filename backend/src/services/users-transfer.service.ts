import { SECRET_KEY } from '@config';
import { GroupsService } from '@services/groups.service';
import { ApplicationsService } from '@services/applications.service';
import { UsersService } from '@services/users.service';
import { createUserBackup, parseUserImport, ParsedUserImport, serializeUserBackup, userBackupFingerprint } from '@/user-store/user-backup';
import { createHmac, timingSafeEqual } from 'crypto';

export class ImportConfirmationError extends Error {}

export type UsersImportPreview = {
  confirmationToken: string;
  format: ParsedUserImport['format'];
  currentUserCount: number;
  incomingUserCount: number;
  preservedUserIds: number;
  generatedUserIds: number;
  removedUserIds: number;
  groupCount: number;
  applicationCount: number;
  replacesGroupCatalog: boolean;
  replacesApplicationCatalog: boolean;
  warnings: string[];
};

export class UsersTransferService {
  private users = new UsersService();
  private groups = new GroupsService();
  private applications = new ApplicationsService();

  private async currentBackup() {
    const [users, groups, applications] = await Promise.all([
      this.users.getUsersForBackup(),
      this.groups.getGroups(),
      this.applications.getApplications(),
    ]);
    return createUserBackup(users, groups, applications);
  }

  private confirmationToken(content: string, currentStateFingerprint: string): string {
    return createHmac('sha256', SECRET_KEY as string)
      .update(content)
      .update('\0')
      .update(currentStateFingerprint)
      .digest('hex');
  }

  private tokenMatches(expected: string, submitted: string): boolean {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const submittedBuffer = Buffer.from(submitted, 'utf8');
    return expectedBuffer.length === submittedBuffer.length && timingSafeEqual(expectedBuffer, submittedBuffer);
  }

  public async exportUsers(): Promise<string> {
    return serializeUserBackup(await this.currentBackup());
  }

  public async previewImport(content: string): Promise<UsersImportPreview> {
    const [parsed, current] = await Promise.all([Promise.resolve(parseUserImport(content)), this.currentBackup()]);
    const currentIds = new Set(current.users.map(user => user.id));
    const incomingIds = new Set(parsed.users.flatMap(user => (user.id ? [user.id] : [])));

    return {
      confirmationToken: this.confirmationToken(content, userBackupFingerprint(current)),
      format: parsed.format,
      currentUserCount: current.users.length,
      incomingUserCount: parsed.users.length,
      preservedUserIds: [...incomingIds].filter(id => currentIds.has(id)).length,
      generatedUserIds: parsed.users.filter(user => !user.id).length,
      removedUserIds: [...currentIds].filter(id => !incomingIds.has(id)).length,
      groupCount: parsed.groups.length,
      applicationCount: parsed.applications.length,
      replacesGroupCatalog: parsed.replacesGroupCatalog,
      replacesApplicationCatalog: parsed.replacesApplicationCatalog,
      warnings: parsed.warnings,
    };
  }

  public async importUsers(content: string, submittedToken: string): Promise<{ imported: number; format: ParsedUserImport['format'] }> {
    const [parsed, current] = await Promise.all([Promise.resolve(parseUserImport(content)), this.currentBackup()]);
    const expectedToken = this.confirmationToken(content, userBackupFingerprint(current));
    if (!this.tokenMatches(expectedToken, submittedToken)) {
      throw new ImportConfirmationError('Importen har inte förhandsgranskats eller testdatan har ändrats sedan förhandsgranskningen.');
    }

    return { imported: await this.users.replaceAllUsers(parsed), format: parsed.format };
  }
}
