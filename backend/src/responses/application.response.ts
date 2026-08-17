import ApiResponse from '@/interfaces/api-service.interface';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsString, ValidateNested } from 'class-validator';

export class AdminApplication {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsNumber()
  userCount: number;
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
