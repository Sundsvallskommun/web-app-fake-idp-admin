import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * A registered OIDC Relying Party. Unlike the SAML side — where an AuthnRequest
 * names its own AssertionConsumerServiceURL and is answered with a signed
 * assertion — OIDC has no signed request, so `redirectUris` IS the security
 * boundary and is matched exactly. Anything an operator can get wrong here is
 * something an attacker could get right, hence the validation in the controller.
 */
export class CreateOidcClientDto {
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  description: string;

  @IsArray()
  @IsString({ each: true })
  redirectUris: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postLogoutRedirectUris?: string[];

  /** Public clients authenticate with PKCE alone and hold no usable secret. */
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePkce?: boolean;

  /** Omit to have one generated. Ignored for public clients. */
  @IsOptional()
  @IsString()
  clientSecret?: string;

  /** Optional link to the tool-metadata Application catalogue. */
  @IsOptional()
  @IsInt()
  applicationId?: number | null;
}

export class UpdateOidcClientDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  clientId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  redirectUris?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  postLogoutRedirectUris?: string[];

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  requirePkce?: boolean;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsInt()
  applicationId?: number | null;
}
