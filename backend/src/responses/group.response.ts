import ApiResponse from '@/interfaces/api-service.interface';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

/** Medlem i en grupp/applikation. Endast identifierande fält — aldrig lösenord. */
export class GroupMember {
  @IsString()
  id: string;
  @IsString()
  name: string;
  @IsString()
  username: string;
}

export class GroupApplication {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
}

export class AdminGroup {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  userCount: number;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupMember)
  users: GroupMember[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupApplication)
  applications: GroupApplication[];
}

export class AdminGroupResponse implements ApiResponse<AdminGroup> {
  @ValidateNested()
  @Type(() => AdminGroup)
  data: AdminGroup;
  @IsString()
  message: string;
}

export class AdminGroupListResponse implements ApiResponse<AdminGroup[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminGroup)
  data: AdminGroup[];
  @IsString()
  message: string;
}
