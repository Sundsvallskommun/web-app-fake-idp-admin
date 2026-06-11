import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

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
}

export class ImportUsersDto {
  // Raw text of an uploaded `users.js` (a CommonJS module exporting `{ users }`).
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
}
