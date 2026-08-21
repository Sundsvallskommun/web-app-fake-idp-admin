import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class AttributeDto {
  @IsString()
  key: string;

  @IsString()
  format: string;

  @IsString()
  value: string;

  @IsString()
  type: string;
}

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  groupIds?: number[];

  /** @deprecated Application access is canonically assigned to groups. Kept so
   * existing admin API clients can migrate without losing direct assignments. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  applicationIds?: number[];
}

export class ImportUsersDto {
  // Raw text of a versioned JSON backup or a legacy users.js file.
  @IsString()
  content: string;

  @IsString()
  confirmationToken: string;
}

export class PreviewUsersImportDto {
  @IsString()
  content: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  // When provided, the attribute set is replaced wholesale.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeDto)
  attributes?: AttributeDto[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  groupIds?: number[];

  /** @deprecated Application access is canonically assigned to groups. Kept so
   * existing admin API clients can migrate without losing direct assignments. */
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  applicationIds?: number[];
}
