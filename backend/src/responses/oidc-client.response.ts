import ApiResponse from '@/interfaces/api-response.interface';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

/** The linked tool-metadata application, when the client is mapped to one. */
export class OidcClientApplication {
  @IsNumber()
  id: number;
  @IsString()
  name: string;
}

export class AdminOidcClient {
  @IsNumber()
  id: number;
  @IsString()
  clientId: string;
  /**
   * Plaintext, on purpose and for the same reason `User.password` is: this is a
   * simulator, and an operator who cannot read the secret back cannot configure
   * the Relying Party that needs it. Empty for public (PKCE-only) clients.
   */
  @IsString()
  clientSecret: string;
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsArray()
  @IsString({ each: true })
  redirectUris: string[];
  @IsArray()
  @IsString({ each: true })
  postLogoutRedirectUris: string[];
  @IsBoolean()
  requirePkce: boolean;
  @IsBoolean()
  isPublic: boolean;
  @IsOptional()
  @IsNumber()
  applicationId: number | null;
  @IsOptional()
  @ValidateNested()
  @Type(() => OidcClientApplication)
  application: OidcClientApplication | null;
}

export class AdminOidcClientResponse implements ApiResponse<AdminOidcClient> {
  @ValidateNested()
  @Type(() => AdminOidcClient)
  data: AdminOidcClient;
  @IsString()
  message: string;
}

export class AdminOidcClientListResponse implements ApiResponse<AdminOidcClient[]> {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminOidcClient)
  data: AdminOidcClient[];
  @IsString()
  message: string;
}
