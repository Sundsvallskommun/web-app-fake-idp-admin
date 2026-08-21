import ApiResponse from '@/interfaces/api-service.interface';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

/** Härledd användare med access. Endast identifierande fält — aldrig lösenord. */
export class ApplicationMember {
  @IsString()
  id: string;
  @IsString()
  name: string;
  @IsString()
  username: string;
}

export class ApplicationGroup {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  userCount: number;
}

export class AdminApplication {
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
  @Type(() => ApplicationMember)
  users: ApplicationMember[];
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationGroup)
  groups: ApplicationGroup[];
}

export class AdminApplicationResponse implements ApiResponse<AdminApplication> {
  @ValidateNested()
  @Type(() => AdminApplication)
  data: AdminApplication;
  @IsString()
  message: string;
}

export class AdminApplicationListResponse implements ApiResponse<AdminApplication[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminApplication)
  data: AdminApplication[];
  @IsString()
  message: string;
}
