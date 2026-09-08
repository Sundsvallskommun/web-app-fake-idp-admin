import ApiResponse from '@/interfaces/api-response.interface';
import { ClientUser } from '@/interfaces/users.interface';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

// export class Permissions implements IPermissions {
//   @IsBoolean()
//   canEditSystemMessages: boolean;
// }

export class User implements ClientUser {
  @IsString()
  name: string;
  @IsString()
  username: string;
  @IsOptional()
  @IsBoolean()
  defaultCredentials?: boolean;
  // @IsEnum(InternalRoleEnum)
  // role: InternalRole;
  // @ValidateNested()
  // @Type(() => Permissions)
  // permissions: Permissions;
}

export class UserApiResponse implements ApiResponse<User> {
  @ValidateNested()
  @Type(() => User)
  data: User;
  @IsString()
  message: string;
}

// ---- Fake-IdP user administration (CRUD) ----

export class UserAttribute {
  @IsNumber()
  id: number;
  @IsString()
  key: string;
  @IsString()
  format: string;
  @IsString()
  value: string;
  @IsString()
  type: string;
}

export class UserGroup {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
}

export class UserApplication {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
}

export class AdminUser {
  @IsString()
  id: string;
  @IsString()
  name: string;
  @IsString()
  username: string;
  @IsString()
  password: string;
  @IsBoolean()
  requirePassword: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAttribute)
  attributes: UserAttribute[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserGroup)
  groups: UserGroup[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserApplication)
  /** Read-only application access derived from `groups`. */
  applications: UserApplication[];
}

export class AdminUserResponse implements ApiResponse<AdminUser> {
  @ValidateNested()
  @Type(() => AdminUser)
  data: AdminUser;
  @IsString()
  message: string;
}

export class AdminUserListResponse implements ApiResponse<AdminUser[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminUser)
  data: AdminUser[];
  @IsString()
  message: string;
}

export class CitizenIdentifier {
  @IsString()
  value: string;
}

export class CitizenIdentifierResponse implements ApiResponse<CitizenIdentifier> {
  @ValidateNested()
  @Type(() => CitizenIdentifier)
  data: CitizenIdentifier;
  @IsString()
  message: string;
}

export class AssertionPreviewAttribute {
  @IsString()
  key: string;
  @IsString()
  format: string;
  @IsString()
  value: string;
  @IsString()
  type: string;
}

export class AssertionPreview {
  @IsString()
  nameId: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssertionPreviewAttribute)
  attributes: AssertionPreviewAttribute[];
}

export class AssertionPreviewResponse implements ApiResponse<AssertionPreview> {
  @ValidateNested()
  @Type(() => AssertionPreview)
  data: AssertionPreview;
  @IsString()
  message: string;
}

export class ImportUsersResult {
  @IsNumber()
  imported: number;
  @IsString()
  format: string;
}

export class UsersImportPreview {
  @IsString()
  confirmationToken: string;
  @IsString()
  format: string;
  @IsNumber()
  currentUserCount: number;
  @IsNumber()
  incomingUserCount: number;
  @IsNumber()
  preservedUserIds: number;
  @IsNumber()
  generatedUserIds: number;
  @IsNumber()
  removedUserIds: number;
  @IsNumber()
  groupCount: number;
  @IsNumber()
  applicationCount: number;
  @IsBoolean()
  replacesGroupCatalog: boolean;
  @IsBoolean()
  replacesApplicationCatalog: boolean;
  @IsArray()
  @IsString({ each: true })
  warnings: string[];
}

export class UsersImportPreviewResponse implements ApiResponse<UsersImportPreview> {
  @ValidateNested()
  @Type(() => UsersImportPreview)
  data: UsersImportPreview;
  @IsString()
  message: string;
}

export class ImportUsersResponse implements ApiResponse<ImportUsersResult> {
  @ValidateNested()
  @Type(() => ImportUsersResult)
  data: ImportUsersResult;
  @IsString()
  message: string;
}
