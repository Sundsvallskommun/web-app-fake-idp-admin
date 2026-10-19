import { HttpException } from '@/exceptions/HttpException';
import { LOCAL_TEST_CLIENT_ID } from '@/oidc-idp/local-client';
import { AdminOidcClientListResponse, AdminOidcClientResponse } from '@/responses/oidc-client.response';
import { CreateOidcClientDto, UpdateOidcClientDto } from '@dtos/oidc-client.dto';
import authMiddleware from '@middlewares/auth.middleware';
import { ApplicationsService } from '@services/applications.service';
import { OidcClientsService } from '@services/oidc-clients.service';
import { isValidUrl } from '@utils/util';
import { Body, Controller, Delete, Get, Param, Post, Put, Res, UseBefore } from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

/**
 * `client_id` travels in query strings and is compared verbatim, so anything that
 * needs escaping — or that differs only by surrounding whitespace — turns into a
 * mismatch the operator cannot see on screen.
 */
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._~-]{1,128}$/;

/**
 * Redirect URIs are matched EXACTLY (OIDC Core 3.1.2.1), so every way of writing
 * "nearly the right URL" fails identically at runtime. Rejecting the malformed
 * ones here turns a baffling `invalid_request` into a form error.
 */
const validateRedirectUris = (uris: string[], field: string): string[] => {
  const cleaned = uris.map(uri => uri.trim()).filter(Boolean);
  for (const uri of cleaned) {
    if (!isValidUrl(uri)) {
      throw new HttpException(400, `${field} must be absolute http(s) URLs — '${uri}' is not`);
    }
    if (uri.includes('#')) {
      throw new HttpException(400, `${field} must not contain a fragment — '${uri}' does`);
    }
  }
  return [...new Set(cleaned)];
};

@Controller('/oidc-clients')
@UseBefore(authMiddleware)
export class OidcClientController {
  private clients = new OidcClientsService();
  private applications = new ApplicationsService();

  private async assertApplicationExists(applicationId: number | null | undefined) {
    if (applicationId === undefined || applicationId === null) {
      return;
    }
    if (!(await this.applications.getApplication(applicationId))) {
      throw new HttpException(400, 'Linked application does not exist');
    }
  }

  private assertClientIdUsable(clientId: string) {
    if (!CLIENT_ID_PATTERN.test(clientId)) {
      throw new HttpException(400, 'client_id may only contain letters, digits, dot, underscore, tilde or hyphen');
    }
    // The built-in test RP is resolved ahead of the database (local-client.ts), so
    // a row with this id could never be reached — reject it instead of storing
    // something that silently does nothing.
    if (clientId === LOCAL_TEST_CLIENT_ID) {
      throw new HttpException(409, `'${LOCAL_TEST_CLIENT_ID}' is reserved for the built-in local test client`);
    }
  }

  @Get()
  @OpenAPI({ summary: 'List registered OIDC clients' })
  @ResponseSchema(AdminOidcClientListResponse)
  async getOidcClients(@Res() response: any) {
    return response.send({ data: await this.clients.getOidcClients(), message: 'success' });
  }

  @Get('/:id')
  @OpenAPI({ summary: 'Return a registered OIDC client' })
  @ResponseSchema(AdminOidcClientResponse)
  async getOidcClient(@Param('id') id: number, @Res() response: any) {
    const client = await this.clients.getOidcClient(id);
    if (!client) {
      throw new HttpException(404, 'OIDC client not found');
    }
    return response.send({ data: client, message: 'success' });
  }

  @Post()
  @OpenAPI({ summary: 'Register an OIDC client. The secret is generated when omitted.' })
  @ResponseSchema(AdminOidcClientResponse)
  async createOidcClient(@Body() body: CreateOidcClientDto, @Res() response: any) {
    const clientId = body.clientId.trim();
    this.assertClientIdUsable(clientId);
    if (await this.clients.getOidcClientByClientId(clientId)) {
      throw new HttpException(409, 'client_id already exists');
    }

    const redirectUris = validateRedirectUris(body.redirectUris ?? [], 'redirectUris');
    // A client with no redirect URI can never complete a flow; failing here beats
    // failing later with an error that points at the RP rather than the registration.
    if (redirectUris.length === 0) {
      throw new HttpException(400, 'At least one redirect URI is required');
    }
    await this.assertApplicationExists(body.applicationId);

    const data = await this.clients.createOidcClient({
      ...body,
      clientId,
      name: body.name.trim(),
      redirectUris,
      postLogoutRedirectUris: validateRedirectUris(body.postLogoutRedirectUris ?? [], 'postLogoutRedirectUris'),
    });
    return response.send({ data, message: 'success' });
  }

  @Put('/:id')
  @OpenAPI({ summary: 'Update a registered OIDC client' })
  @ResponseSchema(AdminOidcClientResponse)
  async updateOidcClient(@Param('id') id: number, @Body() body: UpdateOidcClientDto, @Res() response: any) {
    const existing = await this.clients.getOidcClient(id);
    if (!existing) {
      throw new HttpException(404, 'OIDC client not found');
    }

    const patch: UpdateOidcClientDto = { ...body };

    if (body.clientId !== undefined) {
      const clientId = body.clientId.trim();
      this.assertClientIdUsable(clientId);
      const duplicate = await this.clients.getOidcClientByClientId(clientId);
      if (duplicate && duplicate.id !== id) {
        throw new HttpException(409, 'client_id already exists');
      }
      patch.clientId = clientId;
    }

    if (body.name !== undefined) {
      patch.name = body.name.trim();
      if (!patch.name) {
        throw new HttpException(400, 'Name is required');
      }
    }

    if (body.redirectUris !== undefined) {
      patch.redirectUris = validateRedirectUris(body.redirectUris, 'redirectUris');
      if (patch.redirectUris.length === 0) {
        throw new HttpException(400, 'At least one redirect URI is required');
      }
    }

    if (body.postLogoutRedirectUris !== undefined) {
      patch.postLogoutRedirectUris = validateRedirectUris(body.postLogoutRedirectUris, 'postLogoutRedirectUris');
    }

    await this.assertApplicationExists(body.applicationId);

    return response.send({ data: await this.clients.updateOidcClient(id, patch), message: 'success' });
  }

  @Delete('/:id')
  @OpenAPI({ summary: 'Delete a registered OIDC client' })
  @ResponseSchema(AdminOidcClientResponse)
  async removeOidcClient(@Param('id') id: number, @Res() response: any) {
    if (!(await this.clients.getOidcClient(id))) {
      throw new HttpException(404, 'OIDC client not found');
    }
    await this.clients.removeOidcClient(id);
    return response.send({ data: { id }, message: 'success' });
  }
}
