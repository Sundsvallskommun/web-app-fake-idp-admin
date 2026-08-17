import ApiResponse from '@/interfaces/api-service.interface';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class AdminGroup {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  userCount: number;
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
