import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Till skillnad från gruppnamn (som serialiseras kommaseparerat i SAML-claimet
// `groups`) blir applikationsnamn aldrig claims — därför ingen kommaspärr.
export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;
}

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
