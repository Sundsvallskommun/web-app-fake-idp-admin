import ApiResponse from '@/interfaces/api-service.interface';
import { ClientUser } from '@/interfaces/users.interface';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

// export class Permissions implements IPermissions {
//   @IsBoolean()
//   canEditSystemMessages: boolean;
// }

export class User implements ClientUser {
  @IsString()
  name: string;
  @IsString()
  username: string;
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
