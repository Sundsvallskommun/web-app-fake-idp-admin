import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^,]+$/)
  name: string;

  @IsString()
  description: string;
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
}
