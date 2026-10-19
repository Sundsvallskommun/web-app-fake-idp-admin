-- OIDC Relying Party registry. The SAML role needs no equivalent table: an
-- AuthnRequest carries its own AssertionConsumerServiceURL and is answered with a
-- signed assertion. OIDC has no signed request, so the registered redirect URIs
-- are the only thing standing between a test identity and an attacker-supplied
-- callback -- hence a persisted, admin-managed client list.
--
-- SQLite has no array type and Prisma therefore has no scalar list here, so both
-- URI lists are stored as JSON text and parsed at the store boundary.
-- `clientSecret` is plaintext on purpose, for the same reason `User.password` is:
-- this is a simulator and the operator must be able to read the value back out.
CREATE TABLE "OidcClient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL DEFAULT '',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "redirectUris" TEXT NOT NULL DEFAULT '[]',
    "postLogoutRedirectUris" TEXT NOT NULL DEFAULT '[]',
    "requirePkce" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "applicationId" INTEGER,
    CONSTRAINT "OidcClient_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "OidcClient_clientId_key" ON "OidcClient"("clientId");
CREATE INDEX "OidcClient_applicationId_idx" ON "OidcClient"("applicationId");
