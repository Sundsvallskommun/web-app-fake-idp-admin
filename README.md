# Projektnamn

## APIer som används

Dessa APIer används i projektet, applikationsanvändaren i WSO2 måste prenumerera på dessa.
Systemet utgår ifrån [api-config.ts](./backend/src/config/api-config.ts)/backend/api-config.ts där dessa står specificerade.

## Utveckling

### Krav

- Node >= 20 LTS
- Yarn

### Steg för steg

1. Klona ner repot till en mapp "<web-app-projektnamn>" och skapa nytt git repo

```
npx tiged --mode=git git@github.com:Sundsvallskommun/web-app-starter.git <web-app-projektnamn>
cd <web-app-projektnamn>
git init
```

2. Installera dependencies för både `backend` och `frontend`

```
cd frontend
yarn install

cd backend
yarn install
```

Om du behöver ett administrationsgränssnitt, se [Dokumentation om Admin](./admin/README.md).

3. Skapa .env-fil för `frontend`

```
cd frontend
cp .env-example .env
```

Redigera `.env` för behov, för utveckling bör exempelvärdet fungera.

4. Skapa .env-fil för `backend`

```
cd backend
cp .env.example.local .env.development.local
cp .env.example.local .env.test.local
```

redigera `.env.development.local` för behov. URLer, nycklar och cert behöver fyllas i korrekt.

- `CLIENT_KEY` och `CLIENT_SECRET` måste fyllas i för att APIerna ska fungera, du måste ha en applikation från WSO2-portalen som abonnerar på de microtjänster du anropar
- `SAML_ENTRY_SSO` behöver pekas till en SAML IDP
- `SAML_IDP_PUBLIC_CERT` ska stämma överens med IDPens cert
- `SAML_PRIVATE_KEY` och `SAML_PUBLIC_KEY` behöver bara fyllas i korrekt om man kör mot en riktig IDP

5. Initiera eventuell databas för backend

```
cd backend
yarn prisma:generate
yarn prisma:migrate
```

6. Synca datamodeller för api:er

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
| `yarn dev` (per paket) | `backend/.env.development.local`, `admin/.env`, osv. (via dotenv) | All konfiguration för utvecklingsläge |
| `docker compose` | Inline i `docker-compose.yml` + **root** `.env` (endast för `${VAR}`-interpolering) | Stacken är självkonfigurerande; root-`.env` håller **bara hemligheten** (nyckelparet) |

Docker läser alltså **aldrig** `*.env.*.local`-filerna, och `yarn dev` läser aldrig root-`.env`. Den enda hemlighet Docker behöver är ett självsignerat nyckelpar.

### Steg för steg

1. Skapa root-`.env` från mallen:

   ```
   cp .env.example .env
   ```

2. Generera ett självsignerat nyckelpar och klistra in i `.env` (en rad vardera, med `\n` som radbrytning – se kommentarerna i `.env.example`):

   ```
   openssl req -x509 -newkey rsa:2048 -keyout idp.key -out idp.crt -days 365 -nodes -subj "/CN=fake-idp"
   awk 'NF{printf "%s\\n",$0}' idp.key   # -> SAML_IDP_PRIVATE_KEY
   awk 'NF{printf "%s\\n",$0}' idp.crt   # -> SAML_IDP_PUBLIC_CERT
   ```

   Detta **enda** nyckelpar används för båda rollerna: IdP:n signerar assertions med det, och SP:n både litar på certet och signerar sina egna AuthnRequests med det. Det behövs alltså inget separat SP-nyckelpar (`SAML_PRIVATE_KEY`/`SAML_PUBLIC_KEY` återanvänder IdP-nyckelparet i `docker-compose.yml`).

3. Starta stacken:

   ```
   docker compose up --build
   ```

### Portar och adresser

| Tjänst | URL |
|---|---|
| Admin-gränssnitt | http://localhost:7001 |
| Backend-API | http://localhost:7000/api |
| Swagger | http://localhost:7000/api/api-docs |
| IdP-inloggningssida | http://localhost:7000/api/saml/idp/login |

(Frontend på port 7002 ligger utkommenterad i `docker-compose.yml` – avkommentera tjänsten för att aktivera den.)

### Användardata: import och persistens

- **Databasen startar tom.** Migrationer körs vid uppstart, men ingen seed sker i Docker. Fyll på den på något av tre sätt:
  - **Skapa en admin-användare att logga in med** (gör detta först – panelen kräver en SAML-inloggning). Skriptet frågar efter användarnamn (default `admin`) och lösenord och skapar en användare med de attribut som krävs för inloggning:
    ```
    # lokalt:
    cd backend && yarn create-admin
    # mot Docker-stacken:
    docker compose exec backend yarn create-admin
    ```
  - Skapa fler användare manuellt i admin-gränssnittet (http://localhost:7001).
  - **Importera en `users.js`-fil:** på användarsidan (`/users`) finns knappen **Importera användare**. Välj din `users.js` (samma format som seed-filen, dvs. en CommonJS-modul som exporterar `{ users }`) så **ersätts hela användartabellen** med filens innehåll.
- **Datan överlever ombyggnader.** SQLite-databasen ligger på den namngivna Docker-volymen `backend-data` (`/app/data`). Den behålls vid `docker compose up --build` och `docker compose down`, och töms bara om du uttryckligen kör `docker compose down -v`.

### Noteringar

- Övriga värden (CORS-origins, sessionssecret, WSO2-creds m.m.) har dugliga dev-defaults i `docker-compose.yml` och kan överskridas via root-`.env` (se `.env.example`).

## SAML IdP

Förutom att agera SAML Service Provider (logga in användare i appen) kan backend även agera fejk-**Identity Provider**: den utfärdar signerade SAML-assertions för användarna i Prisma-databasen och kan därmed ersätta den fristående `web-app-fake-sso-idp`. IdP-endpointerna ligger under `/api/saml/idp/*` (modul: `backend/src/saml-idp/`).

### Miljövariabler

Lägg till i `backend/.env.development.local` (se även `backend/.env.example.local`). Värden för nycklar/cert anges på en rad med `\n` som radbrytning, precis som övriga SAML-värden.

- `SAML_IDP_PRIVATE_KEY` — privat nyckel som IdP:n signerar assertions med. **Krävs.**
- `SAML_IDP_ENTITY_ID` — IdP:ns entityID/Issuer, t.ex. `http://localhost:3001/api/saml/idp/metadata`. Används även för att bygga SSO-URL:en i metadata.
- `SAML_SP_AUDIENCE` — Audience/SPNameQualifier i utfärdade assertions. Faller tillbaka till `SAML_ISSUER` om tom.
- `SAML_IDP_ENUMERATE_USERS` — `true` visar en användarlista på inloggningssidan, `false` kräver användarnamn/lösenord.
- `SAML_IDP_PUBLIC_CERT` — (återanvänds) IdP:ns publika cert som motsvarar `SAML_IDP_PRIVATE_KEY`; det är detta cert som Service Providern måste lita på.

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

Sätt SP:ns `SAML_ENTRY_SSO=http://localhost:3001/api/saml/idp/sso` och låt SP:n lita på IdP:ns cert (`SAML_IDP_PUBLIC_CERT`). En SP kan också konfigureras via `GET /api/saml/idp/metadata`. Appens egen SP-sida kan på så vis logga in mot den egna backend-IdP:n istället för den fristående `web-app-fake-sso-idp`.

### Språkstöd

För språkstöd används [next-i18next](https://github.com/i18next/next-i18next).

Placera dina språkfiler i `frontend/public/locales/<locale>/<namespace>.json`.

För ytterligare information om språkstöd i `admin` se [Dokumentation om Admin](./admin/README.md)

För att det ska fungera med **Next.js** och **SSR** måste du skicka med språkdatat till ServerSideProps.
Det gör du genom att lägga till följande till dina page-komponenter (behövs ej i subkomponenter).

```
export const getServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, [<namespaces>])),
  },
});
```

För att lägga till ett ytterligare spåk, skapa en mapp med språkets namn, och lägg sedan till språket i `next-i18next.config.js`.

**Exempel för tyska:**
Skapa `frontend/public/locales/de/common.json`.
Ändra next-i18next.config.js:

```
module.exports = {
  i18n: {
    defaultLocale: 'sv',
    locales: ['sv', 'de'],
  },
 ...
};
```

Som hjälp i VSCode rekommenderas [i18n Ally](https://marketplace.visualstudio.com/items?itemName=Lokalise.i18n-ally).
