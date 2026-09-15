import { CreateOidcClientDto, UpdateOidcClientDto } from '@dtos/oidc-client.dto';
import { encodeUriList, parseUriList } from '@/oidc-idp/client-store';
import prisma from '@utils/prisma';
import { randomBytes } from 'crypto';

const withApplication = {
  include: { application: { select: { id: true, name: true } } },
} as const;

type OidcClientRow = {
  id: number;
  clientId: string;
  clientSecret: string;
  name: string;
  description: string;
  redirectUris: string;
  postLogoutRedirectUris: string;
  requirePkce: boolean;
  isPublic: boolean;
  applicationId: number | null;
  application: { id: number; name: string } | null;
};

/** Row -> admin view: the JSON-encoded URI columns become real arrays. */
export const toOidcClient = (client: OidcClientRow) => ({
  id: client.id,
  clientId: client.clientId,
  clientSecret: client.clientSecret,
  name: client.name,
  description: client.description,
  redirectUris: parseUriList(client.redirectUris),
  postLogoutRedirectUris: parseUriList(client.postLogoutRedirectUris),
  requirePkce: client.requirePkce,
  isPublic: client.isPublic,
  applicationId: client.applicationId,
  application: client.application,
});

/** 32 bytes of base64url — long enough that nobody is tempted to "simplify" it. */
export const generateClientSecret = (): string => randomBytes(32).toString('base64url');

/**
 * A public client authenticates with PKCE alone, so it must not carry a secret at
 * all: a stored-but-unused secret is a value an operator will eventually paste
 * into a real RP and then wonder why `none` was the accepted auth method.
 */
const secretFor = (isPublic: boolean, provided: string | undefined, existing?: string): string => {
  if (isPublic) {
    return '';
  }
  if (provided !== undefined && provided !== '') {
    return provided;
  }
  return existing && existing !== '' ? existing : generateClientSecret();
};

export class OidcClientsService {
  public async getOidcClients() {
    const clients = await prisma.oidcClient.findMany({ ...withApplication, orderBy: { name: 'asc' } });
    return clients.map(toOidcClient);
  }

  public async getOidcClient(id: number) {
    const client = await prisma.oidcClient.findUnique({ where: { id }, ...withApplication });
    return client && toOidcClient(client);
  }

  public async getOidcClientByClientId(clientId: string) {
    const client = await prisma.oidcClient.findUnique({ where: { clientId }, ...withApplication });
    return client && toOidcClient(client);
  }

  public async createOidcClient(data: CreateOidcClientDto) {
    const isPublic = data.isPublic ?? false;
    const client = await prisma.oidcClient.create({
      data: {
        clientId: data.clientId,
        name: data.name,
        description: data.description ?? '',
        redirectUris: encodeUriList(data.redirectUris),
        postLogoutRedirectUris: encodeUriList(data.postLogoutRedirectUris ?? []),
        // Public clients MUST use PKCE; for confidential ones it stays the default.
        requirePkce: isPublic ? true : (data.requirePkce ?? true),
        isPublic,
        clientSecret: secretFor(isPublic, data.clientSecret),
        applicationId: data.applicationId ?? null,
      },
      ...withApplication,
    });
    return toOidcClient(client);
  }

  public async updateOidcClient(id: number, data: UpdateOidcClientDto) {
    const existing = await prisma.oidcClient.findUnique({ where: { id } });
    if (!existing) {
      return null;
    }

    const isPublic = data.isPublic ?? existing.isPublic;
    const requirePkce = isPublic ? true : (data.requirePkce ?? existing.requirePkce);

    const client = await prisma.oidcClient.update({
      where: { id },
      data: {
        ...(data.clientId !== undefined ? { clientId: data.clientId } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.redirectUris !== undefined ? { redirectUris: encodeUriList(data.redirectUris) } : {}),
        ...(data.postLogoutRedirectUris !== undefined ? { postLogoutRedirectUris: encodeUriList(data.postLogoutRedirectUris) } : {}),
        ...(data.applicationId !== undefined ? { applicationId: data.applicationId } : {}),
        requirePkce,
        isPublic,
        clientSecret: secretFor(isPublic, data.clientSecret, existing.clientSecret),
      },
      ...withApplication,
    });
    return toOidcClient(client);
  }

  public removeOidcClient(id: number) {
    return prisma.oidcClient.delete({ where: { id } });
  }
}
