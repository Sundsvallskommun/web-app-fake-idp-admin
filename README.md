# Fake IdP med admingränssnitt

Backend som agerar både SAML Service Provider och fejk-Identity Provider, med ett konfigdrivet admingränssnitt för att hantera IdP-användare. Avsedd som test-/simulator-IdP och kan ersätta den fristående `web-app-fake-sso-idp`.

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.
Systemet utgår ifrån [api-config.ts](./backend/src/config/api-config.ts)/backend/api-config.ts där dessa står specificerade.

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn

### Steg för steg

1. Installera dependencies för både `backend` och `frontend`

```
cd frontend
yarn install

cd backend
yarn install
```

Om du behöver ett administrationsgränssnitt, se [Dokumentation om Admin](./admin/README.md).

2. Skapa .env-fil för `frontend`

```
cd frontend
cp .env-example .env
```

Redigera `.env` för behov, för utveckling bör exempelvärdet fungera.

3. Skapa .env-fil för `backend`

```
cd backend
cp .env.example.kommuninvanare .env.development.kommuninvanare
cp .env.example.kommuninvanare .env.test.kommuninvanare
```

redigera `.env.development.kommuninvanare` för behov. URLer, nycklar och cert behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera, du måste ha en applikation från WSO2-portalen som abonnerar på de microtjänster du anropar
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP

4. Initiera eventuell databas för backend

```
cd backend
yarn prisma:generate
yarn prisma:migrate
```

5. Synca datamodeller för api:er

   Se till att README och /backend/src/config/api-config.ts matchar och justera utefter de api:er som önskas användas.
   - För backend, i /backend kör `yarn generate:contracts` för att få ned de senaste datamodellerna för samtliga api:er
     -- Justera om så behövs utifrån de uppdaterade modellerna

   - För frontend, se till att backend är igång (`yarn dev`), i /frontend kör `yarn generate:contracts` för att synca backend med frontend
     -- Justera om så behövs utifrån de uppdaterade modellerna

## Köra hela stacken med Docker Compose

`docker-compose.yml` startar en fristående lokal stack (backend som agerar både SP och fejk-IdP, samt admin-gränssnittet) som fungerar direkt utan WSO2-uppkoppling.

### Miljöfiler – så hänger det ihop

Det finns två separata sätt att köra appen, med varsin uppsättning miljöfiler. Blanda inte ihop dem:

| Sätt att köra | Läser miljövariabler från | Innehåll |
|---|---|---|
| `yarn dev` (per paket) | `backend/.env.development.kommuninvanare`, `admin/.env`, osv. (via dotenv) | All konfiguration för utvecklingsläge |
| `docker compose` | Inline i `docker-compose.yml` + **root** `.env` (endast för `${VAR}`-interpolering) | Stacken är självkonfigurerande; root-`.env` håller **hemligheten** (nyckelparet) samt domän/port-konfig (`BASE_URL` + `*_PORT`) |

Docker läser alltså **aldrig** `*.env.*.kommuninvanare`-filerna, och `yarn dev` läser aldrig root-`.env`. Den enda hemlighet Docker behöver är ett självsignerat nyckelpar.

### Steg för steg

1. Skapa root-`.env` från mallen:

   ```
   cp .env.example .env
   ```

   `.env.example` innehåller redan ett **inbakat dev-keypair** – du behöver inte generera ett eget för lokal utveckling. Om du vill byta till ett eget keypair, se kommentarerna i `.env.example` (du måste då även uppdatera `signingCertificate` i `keycloak/realm-export.json`).

2. Starta stacken:

   ```
   docker compose up --build
   ```

### Portar och adresser

| Tjänst | URL | Inlogg |
|---|---|---|
| **Fake IdP admin** | http://kommuninvanarehost:7001 | Skapa via `yarn create-admin` |
| **Backend-API** | http://kommuninvanarehost:7000/api | — |
| Swagger | http://kommuninvanarehost:7000/api/api-docs | — |
| IdP-inloggningssida | http://kommuninvanarehost:7001/api/saml/idp/login | fake-IdP-användare |
| IdP-metadata (SAML) | http://kommuninvanarehost:7001/api/saml/idp/metadata | — |
| **Keycloak admin** | http://kommuninvanarehost:7080/admin | admin / admin |
| Keycloak sessioner — invånare | http://kommuninvanarehost:7080/admin → realm **kommuninvanare** → Sessions | — |
| Keycloak sessioner — anställda | http://kommuninvanarehost:7080/admin → realm **employees** → Sessions | — |
| OIDC discovery — invånare | http://kommuninvanarehost:7080/realms/kommuninvanare/.well-known/openid-configuration | — |
| OIDC discovery — anställda | http://kommuninvanarehost:7080/realms/employees/.well-known/openid-configuration | — |
| **Medborgarportalen** (BankID-test) | http://kommuninvanarehost:7090 | testuser / test123 (via fake IdP) |
| **Medarbetarportalen** (AD-test) | http://kommuninvanarehost:7091 | anna.svensson / test123 |

### Testa BankID-inloggningsflödet

Stacken innehåller en enkel medborgarsida (`citizen-app/`) som simulerar en kommunal e-tjänst. Den testar hela kedjan:

```
Medborgarsida → Keycloak (OIDC) → Fake IdP (simulerar Mobility Guard/BankID) → inloggad
```

**1. Skapa en testanvändare** (behövs bara en gång — datan överlever omstarter):

```bash
docker compose exec backend node --input-type=commonjs -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FMT = 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic';
prisma.user.create({ data: {
  name: 'Test User', username: 'testuser', password: 'test123',
  attributes: { create: [
    { key: 'givenName',          format: FMT, value: 'Test',                type: 'xs:string' },
    { key: 'surname',            format: FMT, value: 'User',                type: 'xs:string' },
    { key: 'email',              format: FMT, value: 'testuser@example.com', type: 'xs:string' },
    { key: 'citizenIdentifier',  format: FMT, value: '199001011234',         type: 'xs:string' },
    { key: 'username',           format: FMT, value: 'testuser',             type: 'xs:string' },
    { key: 'groups',             format: FMT, value: 'admin',                type: 'xs:string' },
  ]}
}}).then(u => console.log('Skapad:', u.username)).finally(() => prisma.\$disconnect());
"
```

**2. Öppna medborgarsidan:**

```
http://kommuninvanarehost:7090
```

**3. Klicka "Logga in med BankID"** → går direkt till fake-IdP:ens inloggningsformulär (ingen Keycloak-mellansida).

**4. Välj `testuser` i listan** (eller skriv in `testuser` / `test123`) → klicka Logga in.

**5. Du är inloggad** — sidan visar namn, personnummer och grupp från JWT:n.

**Verifiera i Keycloak:** `http://kommuninvanarehost:7080/admin` → realm **kommuninvanare** → **Sessions** — där syns den aktiva sessionen.

**Byta till riktig Mobility Guard (staging/prod):** uppdatera `singleSignOnServiceUrl` och `signingCertificate` i `keycloak/realm-export.json`. Medborgarsidan och Keycloak ändras inte.

(Frontend på port 7002 ligger utkommenterad i `docker-compose.yml` – avkommentera tjänsten för att aktivera den.)

Domän och portar är konfigurerbara från root-`.env` och kan ändras **oberoende av varandra**:

| Variabel | Default | Styr |
|---|---|---|
| `BASE_URL` | `http://kommuninvanarehost` | Protokoll + värdnamn (utan port, utan avslutande `/`) |
| `BACKEND_PORT` | `7000` | Backendens publicerade host-port |
| `ADMIN_PORT` | `7001` | Adminens publicerade host-port |
| `FRONTEND_PORT` | `7002` | Frontendens publicerade host-port |

Alla SP/IdP-URL:er och adminens `NEXT_PUBLIC_API_URL` byggs ihop av `BASE_URL` + rätt `*_PORT`. Containrarna lyssnar alltid på `3000` internt. `ORIGIN` (CORS) härleds från `BASE_URL` + `ADMIN_PORT`/`FRONTEND_PORT`, men kan överskridas genom att sätta `ORIGIN` explicit i `.env` (t.ex. för att tillåta flera domäner samtidigt).

### Köra hela stacken under en sub-path

Hela stacken (admin-GUI + API + IdP) kan exponeras under ett gemensamt prefix bakom proxyn, t.ex. `https://foobar.com/idp2/...`. Två variabler i root-`.env` styr detta – båda tomma ger standardlayouten (admin på `/`, API på `/api`):

| Variabel | Exempel | Styr |
|---|---|---|
| `PUBLIC_PREFIX` | `/idp2` | Prefix för API + IdP: `<host>/idp2/api/*` och `<host>/idp2/api/saml/idp/*` |
| `ADMIN_BASE_PATH` | `/idp2/admin` | Next.js `basePath` för admin-GUI:t: `<host>/idp2/admin/*` |

```
PUBLIC_PREFIX=/idp2
ADMIN_BASE_PATH=/idp2/admin
```

Den medföljande proxyn (`nginx.conf.template`) läser dessa via envsubst och dirigerar `${PUBLIC_PREFIX}/api/*` till backend (prefixet strippas) och `${ADMIN_BASE_PATH}/*` till admin. Allt ligger på samma origin, så SAML-sessionscookien förblir first-party.

`basePath` och `NEXT_PUBLIC_*` **bakas in när admin-imagen byggs**, så du måste bygga om:

```
docker compose up -d --build
```

Använder du en **egen proxy** istället för den medföljande, applicera motsvarande regler (prefixet strippas mot backendens `/api/`, admin-vägen skickas vidare oförändrad):

```nginx
location /idp2/api/   { proxy_pass http://<backend>:3000/api/; }   # strippar /idp2
location /idp2/admin/ { proxy_pass http://<admin>:3000; }          # ingen omskrivning
```

En extern Service Provider pekas mot `<host>/idp2/api/saml/idp/sso` och läser IdP-metadata på `<host>/idp2/api/saml/idp/metadata`.

### Apache (httpd) som omvänd proxy

Vill du köra Apache istället för den medföljande nginx-proxyn gäller samma princip: admin-GUI och API serveras under **ett** origin så att SAML-sessionscookien förblir first-party. Aktivera `mod_proxy`, `mod_proxy_http` och `mod_headers`.

`<backend>`/`<admin>` är uppströmsmålen: i compose-nätverket `backend:3000` respektive `admin:3000`. Körs Apache på hosten används istället de publicerade portarna (`http://127.0.0.1:7000` / `http://127.0.0.1:7001`).

**Standardlayout** (admin på `/`, API på `/api` – `PUBLIC_PREFIX`/`ADMIN_BASE_PATH` tomma):

```apache
<VirtualHost *:80>
    ServerName kommuninvanarehost

    ProxyPreserveHost On
    ProxyRequests Off
    RequestHeader set X-Forwarded-Proto "http"      # "https" bakom TLS-terminering

    # Adminens egen Next.js-healthroute (/api/health/up) ska gå till admin, inte
    # backend. ProxyPass matchar första träff, så den mer specifika regeln först.
    ProxyPass        /api/health/up http://<admin>:3000/api/health/up
    ProxyPassReverse /api/health/up http://<admin>:3000/api/health/up

    # Backend-API + SAML SP/IdP.
    ProxyPass        /api/ http://<backend>:3000/api/
    ProxyPassReverse /api/ http://<backend>:3000/api/

    # Admin-GUI (Next.js) – allt annat.
    ProxyPass        /     http://<admin>:3000/
    ProxyPassReverse /     http://<admin>:3000/
</VirtualHost>
```

**Sub-path-layout** (`PUBLIC_PREFIX=/idp2`, `ADMIN_BASE_PATH=/idp2/admin`): prefixet **strippas** mot backend (backend monterar allt under `/api`), medan admin-vägen skickas vidare **oförändrad** (Next byggs med `basePath=/idp2/admin` och serverar sina sidor och assets under den vägen):

```apache
    # API + SAML SP/IdP: /idp2/api/users -> backend /api/users  (prefixet strippas).
    ProxyPass        /idp2/api/ http://<backend>:3000/api/
    ProxyPassReverse /idp2/api/ http://<backend>:3000/api/

    # Admin-GUI: behåll hela /idp2/admin-vägen (ingen avslutande slash, så även
    # bara /idp2/admin matchar och inte faller igenom till en ev. catch-all).
    ProxyPass        /idp2/admin http://<admin>:3000/idp2/admin
    ProxyPassReverse /idp2/admin http://<admin>:3000/idp2/admin
```

`ProxyPass` matchar **första träff**, så lägg dessa **före** en ev. bredare regel (t.ex. en `/`-catch-all). Lägg **inte** en bred `/idp2`-regel före `/idp2/admin` – då fångas admin-trafiken av fel regel. `users.js`-importen postar filen som en JSON-body; Apache har ingen storleksgräns på proxyade requests by default, men har du satt `LimitRequestBody` globalt behöver vägen tillåta minst ~10 MB (`LimitRequestBody 10485760`).

#### Bakom en egen proxy utan domän/TLS (t.ex. åtkomst via IP)

Fronter du stacken med en **egen** proxy (Apache ovan) på en annan origin än containerportarna – typiskt port 80 utan portsuffix, och/eller åtkomst via IP eftersom domän/TLS inte är på plats (t.ex. `http://172.16.124.2`) – räcker inte proxy-reglerna. `docker-compose.yml` bygger nämligen alla **webbläsarvända** URL:er som `BASE_URL:ADMIN_PORT`, så admin-bundlen och SAML-URL:erna pekar webbläsaren mot fel port (t.ex. `:7101`) → cross-site-cookie-401 och trasiga SAML-redirects.

Lägg därför till overlay-filen `docker-compose.external-proxy.yml`, som baserar om alla webbläsarvända URL:er på `PUBLIC_ORIGIN`, publicerar admin-containern direkt (din proxy pratar med den) och stänger av den medföljande nginx-proxyn. I root-`.env`:

```
PUBLIC_ORIGIN=http://172.16.124.2     # origin webbläsaren använder (din proxy), utan avslutande /
PUBLIC_PREFIX=/idp2
ADMIN_BASE_PATH=/idp2/admin
BACKEND_PORT=7100                      # din proxy -> backend  (/idp2/api -> :7100)
ADMIN_PORT=7101                        # din proxy -> admin    (/idp2/admin -> :7101)
```

Bygg om (overlay-filen auto-laddas **inte**, ange den explicit; `NEXT_PUBLIC_API_URL` bakas in vid build):

```
docker compose -f docker-compose.yml -f docker-compose.external-proxy.yml up -d --build
```

Eftersom allt nu ligger på `http://172.16.124.2` (port 80) är trafiken first-party. Det är ren HTTP, så sätt **inte** `X-Forwarded-Proto https` – cookies är icke-`Secure` by design, vilket är rätt här. Verifiera efteråt att `…/idp2/api/saml/idp/metadata` anger `SingleSignOnService` på `http://172.16.124.2/idp2/api/saml/idp/sso` (utan `:7101`), och att adminens nätverksanrop går till `http://172.16.124.2/idp2/api/...`.

**`ProxyPreserveHost On` krävs.** Admin-GUI:t är Next.js och bygger sina redirects (t.ex. den avslutande slashen `/idp2/admin` → `/idp2/admin/`) från `Host`-headern. Med `ProxyPreserveHost Off` skickar Apache uppströmsvärden (`kommuninvanarehost`) istället för klientens, så du hamnar på `http://kommuninvanarehost/idp2/admin/`. Backend påverkas inte (den bygger sina SAML-URL:er från `PUBLIC_ORIGIN`). Behöver en annan app i samma vhost se `kommuninvanarehost`, scope:a direktivet i ett `<Location /idp2>`-block istället för vhost-nivå.

### Användardata: import och persistens

- **Databasen startar tom.** Migrationer körs vid uppstart, men ingen seed sker i Docker. Fyll på den på något av tre sätt:
  - **Skapa en admin-användare att logga in med** (gör detta först – panelen kräver en SAML-inloggning). Skriptet frågar efter användarnamn (default `admin`) och lösenord och skapar en användare med de attribut som krävs för inloggning:
    ```
    # lokalt:
    cd backend && yarn create-admin
    # mot Docker-stacken:
    docker compose exec backend yarn create-admin
    ```
  - Skapa fler användare manuellt i admin-gränssnittet (http://kommuninvanarehost:7001).
  - **Importera en `users.js`-fil:** på användarsidan (`/users`) finns knappen **Importera användare**. Välj din `users.js` (samma format som seed-filen, dvs. en CommonJS-modul som exporterar `{ users }`) så **ersätts hela användartabellen** med filens innehåll.
- **Datan överlever ombyggnader.** SQLite-databasen ligger på den namngivna Docker-volymen `backend-data` (`/app/data`). Den behålls vid `docker compose up --build` och `docker compose down`, och töms bara om du uttryckligen kör `docker compose down -v`.

### Noteringar

- Övriga värden (CORS-origins, sessionssecret, WSO2-creds m.m.) har dugliga dev-defaults i `docker-compose.yml` och kan överskridas via root-`.env` (se `.env.example`).

## Keycloak – OIDC identity broker

Stacken inkluderar Keycloak som fungerar som OIDC-broker mot fake-IdP:en. Det ger det flöde som används i produktion med Mobility Guard:

```
App (OIDC) → Keycloak → Fake IdP (SAML, simulerar Mobility Guard/BankID) → inloggad
```

Realm `kommuninvanare` importeras automatiskt vid första start med fake-IdP:en förkonfigurerad. Det finns en inbyggd test-OIDC-klient (`kommuninvanare-test-client`) och ett `citizen-attributes` client scope som för med sig `citizenIdentifier`, `groups` och `municipalityUsername` i tokens.

### Ansluta en app mot Keycloak (OIDC)

OIDC discovery-URL: `http://kommuninvanarehost:7080/realms/kommuninvanare/.well-known/openid-configuration`

Registrera din klient i Keycloak admin-UI (`http://kommuninvanarehost:7080`, inlogg admin/admin) under realm `kommuninvanare` → Clients → Create. Välj `openid-connect`, konfigurera redirect-URI:er och välj om klienten ska vara publik eller konfidentiell.

### Byta till riktig Mobility Guard (staging/prod)

Uppdatera `singleSignOnServiceUrl` i `keycloak/realm-export.json` till Mobility Guards SSO-URL och byt `signingCertificate` till Mobility Guards cert. Appen som ansluter ändras inte – den pekar alltid på Keycloak.

> **OBS:** `keycloak/realm-export.json` importeras **bara vid första start** (tom databas). Vid ändring: `docker compose down -v keycloak && docker compose up keycloak`

## SAML IdP

Förutom att agera SAML Service Provider (logga in användare i appen) kan backend även agera fejk-**Identity Provider**: den utfärdar signerade SAML-assertions för användarna i Prisma-databasen och kan därmed ersätta den fristående `web-app-fake-sso-idp`. IdP-endpointerna ligger under `/api/saml/idp/*` (modul: `backend/src/saml-idp/`).

### Miljövariabler

Lägg till i `backend/.env.development.kommuninvanare` (se även `backend/.env.example.kommuninvanare`). Värden för nycklar/cert anges på en rad med `\n` som radbrytning, precis som övriga SAML-värden.

- `SAML_IDP_PRIVATE_KEY` — privat nyckel som IdP:n signerar assertions med. **Krävs.**
- `SAML_IDP_ENTITY_ID` — IdP:ns entityID/Issuer, t.ex. `http://kommuninvanarehost:3001/api/saml/idp/metadata`. Används även för att bygga SSO-URL:en i metadata.
- `SAML_SP_AUDIENCE` — Audience/SPNameQualifier i utfärdade assertions. Faller tillbaka till `SAML_ISSUER` om tom.
- `SAML_IDP_ENUMERATE_USERS` — `true` visar en användarlista på inloggningssidan, `false` kräver användarnamn/lösenord.
- `SAML_IDP_PUBLIC_CERT` — (återanvänds) IdP:ns publika cert som motsvarar `SAML_IDP_PRIVATE_KEY`; det är detta cert som Service Providern måste lita på.
- `SAML_IDP_BASE_PATH` — (valfritt) publik sub-path-prefix för IdP:n. T.ex. `/myidp` exponerar IdP:n på `<host>/myidp/api/saml/idp/*` (utöver standardvägen). Tom = inget prefix (standard). Se [Köra IdP:n under en sub-path](#köra-idpn-under-en-sub-path-tex-foobarcommyidp).

Generera ett självsignerat nyckelpar för test:

```
openssl req -x509 -newkey rsa:2048 -keyout idp.key -out idp.crt -days 365 -nodes -subj "/CN=fake-idp"
```

### Endpoints

- `GET`/`POST /api/saml/idp/sso` — tar emot AuthnRequest (HTTP-Redirect respektive HTTP-POST).
- `POST /api/saml/idp/authenticate` — validerar inloggning och postar tillbaka en signerad assertion.
- `GET`/`POST /api/saml/idp/login` — IdP:ns startsida (inloggning / detaljer).
- `GET /api/saml/idp/logout` — loggar ut från IdP:n.
- `GET /api/saml/idp/metadata` — IdP-metadata för att konfigurera en Service Provider.

### Peka en Service Provider mot IdP:n

Sätt SP:ns `SAML_ENTRY_SSO=http://kommuninvanarehost:3001/api/saml/idp/sso` och låt SP:n lita på IdP:ns cert (`SAML_IDP_PUBLIC_CERT`). En SP kan också konfigureras via `GET /api/saml/idp/metadata`. Appens egen SP-sida kan på så vis logga in mot den egna backend-IdP:n istället för den fristående `web-app-fake-sso-idp`.

### Köra IdP:n under en sub-path (t.ex. `foobar.com/myidp`)

IdP:ns routes monteras under `/api/saml/idp/*`. Sätt `SAML_IDP_BASE_PATH` till ett prefix så monteras routern **även** under `<prefix>/api/saml/idp/*`, och alla webbläsarvända URL:er (formulärens `action` för login/logout/authenticate samt `SingleSignOnService`-Location i metadata) får med prefixet. Tom variabel = inget prefix, så befintliga uppsättningar påverkas inte.

Med `SAML_IDP_BASE_PATH=/myidp` nås IdP:n alltså på `<host>/myidp/api/saml/idp/login`, `…/sso` osv. Eftersom routern monteras på båda vägarna fungerar det **både** vid direktaccess mot backend och bakom en omvänd proxy (proxyn behöver inte skriva om sökvägen).

1. **Miljö** (sätt i root-`.env` och **bygg om** backend-imagen så ändringen läses in – se nedan):

   ```
   SAML_IDP_BASE_PATH=/myidp
   SAML_IDP_ENTITY_ID=https://foobar.com/myidp/api/saml/idp/metadata
   SAML_ENTRY_SSO=https://foobar.com/myidp/api/saml/idp/sso
   ```

   SSO-URL:en i metadata byggs från `SAML_IDP_ENTITY_ID`:s origin + den publika basen, så `SAML_IDP_ENTITY_ID` måste vara den fullständiga publika URL:en. `SAML_IDP_BASE_PATH` normaliseras – inledande/avslutande snedstreck spelar ingen roll (`myidp`, `/myidp` och `/myidp/` blir alla `/myidp`). Sätt den **inte** till bara `/`.

2. **Omvänd proxy** (vid behov) – eftersom backend redan svarar på prefix-vägen behöver proxyn bara vidarebefordra den oförändrad (ingen omskrivning, alltså **ingen** avslutande slash på `proxy_pass`):

   ```nginx
   location /myidp/ {
       proxy_pass http://backend:3000;
       proxy_set_header Host $http_host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
   }
   ```

3. **Service Provider** – peka SP:ns entryPoint på `https://foobar.com/myidp/api/saml/idp/sso` och läs in IdP-metadata från `https://foobar.com/myidp/api/saml/idp/metadata`. Cert, issuer och audience är oförändrade.

Ovanstående gäller backend-nivån (relevant vid `yarn dev` eller när backend körs fristående). I **Docker-stacken** sätter du istället `PUBLIC_PREFIX` i root-`.env` – då härleder `docker-compose.yml` automatiskt `SAML_IDP_BASE_PATH`, `SAML_ENTRY_SSO` och `SAML_IDP_ENTITY_ID`. Vill du dessutom lägga admin-GUI:t under prefixet, se [Köra hela stacken under en sub-path](#köra-hela-stacken-under-en-sub-path). Kör `docker compose up -d --build` efter ändring (värdena bakas in i imagen).

### Språkstöd

För språkstöd används [next-i18next](https://github.com/i18next/next-i18next).

Placera dina språkfiler i `frontend/public/kommuninvanarees/<kommuninvanaree>/<namespace>.json`.

För ytterligare information om språkstöd i `admin` se [Dokumentation om Admin](./admin/README.md)

För att det ska fungera med **Next.js** och **SSR** måste du skicka med språkdatat till ServerSideProps.
Det gör du genom att lägga till följande till dina page-komponenter (behövs ej i subkomponenter).

```
export const getServerSideProps = async ({ kommuninvanaree }) => ({
  props: {
    ...(await serverSideTranslations(kommuninvanaree, [<namespaces>])),
  },
});
```

För att lägga till ett ytterligare spåk, skapa en mapp med språkets namn, och lägg sedan till språket i `next-i18next.config.js`.

**Exempel för tyska:**
Skapa `frontend/public/kommuninvanarees/de/common.json`.
Ändra next-i18next.config.js:

```
module.exports = {
  i18n: {
    defaultLocale: 'sv',
    kommuninvanarees: ['sv', 'de'],
  },
 ...
};
```

Som hjälp i VSCode rekommenderas [i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally).
