import ApiResponse from '@/interfaces/api-service.interface';
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

export class ImportUsersResult {
  // Number of users created from the uploaded file.
  @IsNumber()
  imported: number;
}

export class ImportUsersResponse implements ApiResponse<ImportUsersResult> {
  @ValidateNested()
  @Type(() => ImportUsersResult)
  data: ImportUsersResult;
  @IsString()
  message: string;
}
