import { ArrayUnique, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^,]+$/)
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  applicationIds?: number[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^,]+$/)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  applicationIds?: number[];
}
