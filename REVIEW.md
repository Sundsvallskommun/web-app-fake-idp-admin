# Genomgång av Fake IdP Admin

*2026-08-17 · granskad på branchen `integration/next` (#3 + #4 + #5 + shadcn-migreringen), både i kod och mot körande docker-stack på localhost:7001.*

> **Status: åtgärdat.** Samtliga fynd nedan är åtgärdade i efterföljande commits på
> samma branch, verifierade med type-check/lint/test i båda paketen och tre
> Playwright-smokes mot den ombyggda docker-stacken. Tre medvetna undantag:
> 3.4 (TanStack Query — större ombyggnad; symptomen är åtgärdade via felstater,
> dedupe och alltid-omhämtning), 6.2 (RSA-fixtur — marginell) och 7.2
> (Dockerfile-workarounden behålls tills Next fixar tracingen). Smoke-sviten
> hittade dessutom en bugg äldre än migreringen: radera-flödet i det generiska
> formuläret navigerade aldrig efter lyckad radering (`handleRemove` fick ett
> redan startat promise istället för en thunk, dolt av `Remove<T = any>`).

Dokumentet listar brister, tveksamma vägval och förbättringsförslag — bibliotek, funktion och utseende. Varje fynd har **var**, **varför det spelar roll** och **förslag**. Skalan:

- 🔴 **Hög** — påverkar användare eller datasäkerhet konkret
- 🟡 **Medel** — märks i verklig användning eller kostar vid vidareutveckling
- ⚪ **Låg** — skavank eller hygien

## Sammanfattning — det viktigaste först

| # | Fynd | Nivå |
|---|---|---|
| 1.1 | Felstater är osynliga: misslyckad hämtning ser ut som tom lista | 🔴 |
| 1.2 | Raleway 404:ar under `ADMIN_BASE_PATH` — typsnittet tyst fel i prefixad deploy | 🟡 |
| 1.3 | `useParams` från App Router-API:t används i Pages Router-sidor | 🟡 |
| 1.4 | "Skapad/Senast uppdaterad" visar tomma värden på grupper | 🟡 |
| 2.2 | Inget spärr/varning när default-lösenordet `admin/admin` används | 🟡 |
| 6.1 | Ingen CI kör admin över huvud taget — alla UI-regressionsfel är "tysta" | 🔴 |
| 3.1 | Två parallella HTTP-lager med olika felhantering | 🟡 |

---

## 1. Buggar och funktionella brister

### 1.1 🔴 Felstater är osynliga
**Var:** `admin/src/utils/use-crud-helpers.ts`, `admin/src/utils/use-resource.ts`, listsidorna.
**Varför:** När `getMany` misslyckas fångas felet i en tom `catch` som bara visar en toast. Toasten försvinner efter några sekunder — kvar står en tom lista som är omöjlig att skilja från "det finns inga". En användare som missar toasten (eller kommer tillbaka till fliken senare) tror att databasen är tom. Under den här granskningen inträffade exakt det förvirringsläget: väljaren visade "inga grupper" medan API:t hade 53 (cache-buggen är fixad, men felvägen har samma symptom).
**Förslag:** Låt `use-resource` spara ett `error`-tillstånd i storen och rendera en feltyta med "Försök igen"-knapp i `ListResources` och gruppväljaren, istället för tom-statens text. Toasten kan vara kvar som komplement.

### 1.2 🟡 Typsnittet 404:ar under sub-path
**Var:** `admin/public/fonts/fonts.css` (rot-absoluta `url('/fonts/…')`), `admin/next.config.js` (sass-variabeln `$basePath` injiceras men används av noll filer).
**Varför:** Stacken är byggd för att kunna köras under prefix (`ADMIN_BASE_PATH`, se `docker-compose.external-proxy.yml`). Next skriver inte om `url()` i CSS, så i prefixad deploy laddar fonterna från fel URL och Raleway faller tyst tillbaka på systemtypsnitt — appen ser "nästan rätt" ut, vilket är värre än ett tydligt fel. Mekanismen som skulle lösa det (`$basePath`) kan inte ens användas: variabeln kan inte interpoleras i en ren `.css`-fil.
**Förslag:** Döp om till `fonts.scss`, använd `url('#{$basePath}/fonts/…')`, importera från `tailwind.scss`. Verifiera i den prefixade docker-uppsättningen — inte bara på localhost.
**Bonus i samma fil:** `h4` listas två gånger i rubrikselektorn och `h5` saknas; `.btn`-selektorn matchar ingenting i appen.

### 1.3 🟡 Blandade router-API:er
**Var:** `admin/src/pages/users/[id].tsx:17`, `admin/src/pages/[resource]/index.tsx:14`, `admin/src/pages/[resource]/[id].tsx:17` — `import { useParams } from 'next/navigation'`.
**Varför:** Appen kör Pages Router, men tre sidor läser URL-parametrar via App Router-hooken. Det råkar fungera i nuvarande Next, men det är odokumenterat gränsland: `useParams` i Pages Router returnerar `null` vid första render i vissa lägen, och beteendet kan ändras vid varje Next-uppgradering. Koden hanterar det med `typeof _id === 'object'`-krumbukter som inte hade behövts.
**Förslag:** Använd `useRouter().query` konsekvent (finns redan importerad i samma filer). Mekanisk ändring, tre filer.

### 1.4 🟡 Tomma "Skapad/Senast uppdaterad" på grupper
**Var:** `admin/src/pages/[resource]/[id].tsx` (headerInfo) + `admin/src/config/defaults.ts` (`defaultInformationFields = ['id', 'createdAt', 'updatedAt']`).
**Varför:** Header-listan antar att alla resurser har de tre fälten. `Group`-modellen (`backend/prisma/schema.prisma`) har bara `id/name/description` — så gruppredigeringen visar "**Skapad:** " följt av ingenting. Ser trasigt ut, och är det: etiketter utan värden är brus.
**Förslag:** Filtrera headerInfo på fält som faktiskt finns i `formdata` och har värde. Alternativt: lägg `createdAt/updatedAt` på `Group` i Prisma — de är billiga och användbara i en testkatalog.

### 1.5 ⚪ Ingen dedupe av parallella hämtningar
**Var:** `admin/src/utils/use-resource.ts`.
**Varför:** Efter cache-fixen (hämta alltid om vid montering) gör startsidan med två `ResourceCard` + en samtidigt öppen lista flera identiska `getMany`-anrop. Datat är litet och lokalt så det märks inte, men mönstret skalar dåligt och `loading`-flaggan flimrar.
**Förslag:** Hoppa över `refresh()` om `loading` redan är sann — enradersvakt. Vid större behov: byt hela `use-resource`/zustand-persist mot TanStack Query, som ger stale-while-revalidate, dedupe och felstater gratis (se 3.4).

### 1.6 ⚪ Tabellen saknar sidstorleksväljare och tom-state med handling
**Var:** `admin/src/components/list-resources/list-table.tsx` (fast `pageSize=15`), `list-resources.tsx` (tom-staten är en rubrik).
**Varför:** Med 53+ grupper blir det fyra sidor utan möjlighet att visa fler per sida. Och tom-staten "Inga testidentiteter hittades" erbjuder ingen väg vidare, medan gruppväljaren i formuläret har "Skapa den första gruppen"-länk — inkonsekvent.
**Förslag:** Select för 15/50/100 per sida bredvid pagineringen; tom-state med "Skapa ny"-länk (finns redan i `resources`-registret via `create`).

## 2. Säkerhet

Det här är en **testsimulator** — klartextlösenord, SHA-1-signering och användaruppräkning är *dokumenterade, avsiktliga val* (se `CLAUDE.md`, `backend/.env.example.local`). De ska inte "fixas"; de ska inhägnas. Granskningen fokuserar därför på inhägnaden.

### 2.1 ✅ Styrkor värda att bevara
`backend/src/app.ts` + `backend/src/services/admin-auth.service.ts` efter #4 håller förvånansvärt god klass för ett testverktyg: timing-säker lösenordsjämförelse (`timingSafeEqual`), **separata sessioner** för admin (`sameSite: strict`) och SAML-flödet (`lax`) med olika cookienamn, CSRF-skydd (`csrf-sync`), `helmet`, och rate limiting på auth-endpoints. Rör inte detta vid refaktorering.

### 2.2 🟡 Ingen spärr när default-lösenordet används
**Var:** `ADMIN_USERNAME`/`ADMIN_PASSWORD` i root-`.env`, default `admin/admin` i `docker-compose.yml`-kedjan.
**Varför:** Verktyget är byggt för att ibland fronta en publik reverse proxy (`docker-compose.external-proxy.yml` + `PUBLIC_ORIGIN` finns just för det). Den dag någon exponerar stacken utåt med kvarstående default-lösenord är hela IdP:n öppen — och den kan utfärda giltiga SAML-assertions till anslutna SP-appar.
**Förslag:** Logga en skarp varning vid start och visa en banner i admin-UI:t när `ADMIN_PASSWORD === 'admin'`; överväg att vägra starta om default-lösenord kombineras med en icke-localhost `PUBLIC_ORIGIN`. Litet ingrepp, stor skillnad i felläge.

### 2.3 ⚪ Exporten laddar ner klartextlösenord utan friktion
**Var:** `admin/src/pages/users/index.tsx` (`onExport`).
**Varför:** En klick ger en fil med samtliga testidentiteters lösenord. Helt enligt syftet — men filen hamnar i Hämtade filer och glöms. En bekräftelsedialog ("filen innehåller lösenord i klartext") gör nedladdningen medveten utan att hindra den. `ConfirmProvider` finns redan.

## 3. Arkitektur och kodval

### 3.1 🟡 Två HTTP-lager med olika felhantering
**Var:** genererade `Api`-klassen (`admin/src/data-contracts/backend/`) används av resursregistret; `admin/src/services/api-service.ts` (egen axios-wrapper) används av user-service, import/export och admin-auth.
**Varför:** Två klienter betyder två ställen för basURL, credentials, felhantering och 401-beteende. `api-service.handleError` gör dessutom `window.location.href = '/login'` vid 401 — en hård sidladdning som kastar bort formulärtillstånd och ger lint-varning (`no-location-assign-relative-destination`), medan den genererade klienten inte har någon 401-hantering alls: en utloggad session mitt i en CRUD-operation ger bara en fel-toast.
**Förslag:** Låt den genererade klientens `http-client` få en interceptor som delar 401-logik med `api-service` (via `router.push`), eller migrera de bespoke anropen till den genererade klienten. Målet är *en* definition av "vad händer vid 401".

### 3.2 🟡 Två formulärvägar utan uttalad regel
**Var:** `users` har egen sida + `user-form/` (schema-drivet med kända SAML-attribut, gruppväljare); `groups` kör den generiska `[resource]/[id]` + `edit-resource/`.
**Varför:** Båda vägarna är rimliga, men inget säger *när* man ska välja vilken. Nästa resurs som läggs till kommer att hamna fel av misstag, och de två vägarna har redan divergerat i utseende (den generiska fick textknappar under först nu).
**Förslag:** En kort regel i `admin/README.md` eller `SHADCN.md`: *generisk väg tills resursen behöver relationsfält eller domänlogik; då egen sida enligt users-mönstret*. Håll utseendet synkat via gemensamma byggstenar (spara/ta bort-raden är en kandidat att bryta ut).

### 3.3 ⚪ `renderColumn` tappar typen
**Var:** `admin/src/interfaces/resource.ts` (`ResourceColumn.renderColumn(value, item: Record<string, unknown>)`), `admin/src/config/resources.ts` (`item as unknown as AdminUser`).
**Varför:** Dubbelcasten är ett hål där en API-ändring (t.ex. att `groups`-relationen döps om) kompilerar glatt och kraschar i runtime.
**Förslag:** Gör `ResourceColumn<T>` generisk och låt `Resource<T>` använda `ResourceColumn<T>[]` — casten försvinner och kolumndefinitionerna blir typkontrollerade mot datakontraktet.

### 3.4 ⚪ zustand-persist är fel verktyg för serverdata
**Var:** `admin/src/utils/use-localstorage.hook.ts` — persisterar både UI-val (kolumnval) *och* hämtad serverdata (`resourceData`) i sessionStorage.
**Varför:** Serverdata i persist-lager var grundorsaken till cache-buggen som fixades under granskningen (väljaren visade 0 grupper när API:t hade 53). Kolumnval hör hemma där; svarsdata gör det inte — den blir stale per definition.
**Förslag:** Kortsiktigt räcker dagens fix (alltid omhämtning). Vid nästa större arbete: flytta serverdata till TanStack Query och låt zustand-storen bara äga UI-tillstånd. Det tar samtidigt bort `loading`-flimret och ger 1.1/1.5 gratis.

### 3.5 ⚪ `import 'dotenv'` i klientkod
**Var:** `admin/src/utils/use-localstorage.hook.ts:1`, `admin/src/utils/use-resource.ts:4`.
**Varför:** dotenv är ett Node-bibliotek; i webbläsarbundeln gör importen ingenting utom att dra in död kod och förvirra läsaren (env-värden i Next inlinas vid build, inte via dotenv i klienten).
**Förslag:** Ta bort båda raderna.

### 3.6 ⚪ Paketnamnet ljuger
**Var:** `admin/package.json` — `"name": "@sk-web-gui/web-app-starter"`.
**Varför:** Appen är varken sk-web-gui (borttaget) eller en starter. Namnet dyker upp i lockfiler, felmeddelanden och licensverktyg.
**Förslag:** `"fake-idp-admin"`. Samma sak i `backend/package.json` (`"backend"`) — döp gärna till `"fake-idp-backend"`.

## 4. UI och utseende

### 4.1 🟡 Ikonknappar utan synlig förklaring
**Var:** `admin/src/components/list-toolbar/list-toolbar.tsx` — skapa ny (dokumentikon), uppdatera, kolumnval är enbart ikoner med `aria-label`.
**Varför:** Aria-label hjälper skärmläsare men inte seende användare — särskilt "dokument-plus"-ikonen för *skapa ny* är inte självförklarande. Ingen tooltip finns.
**Förslag:** Lägg `Tooltip` (finns redan i `ui/`) runt knapparna, eller ge "Skapa ny" text som `Importera/Exportera` har. Skapa-knappen är den viktigaste åtgärden på sidan och förtjänar mer än en ikon.

### 4.2 ⚪ Hårdkodade svenska fallbacks utspridda
**Var:** `t('common:clear', { defaultValue: 'Rensa' })` m.fl. i `list-resources.tsx`, `list-table.tsx`, `password-input.tsx`, `user-form.component.tsx`; `aria-label` i tabellen.
**Varför:** Fungerar, men strängarna bor i komponenterna istället för i `public/locales/sv/common.json`. Den dag ett andra språk läggs till (configen är förberedd) måste någon jaga fallbacks i koden.
**Förslag:** Flytta in nycklarna (`clear`, `show_password`, `hide_password`, `page_of`, `previous_page`, `next_page`, `columns`, `edit`) i `common.json` och ta bort defaultValue-argumenten.

### 4.3 ⚪ Långa gruppbeskrivningar spränger listtabellen
**Var:** `/groups`-listan; beskrivningskolumnen renderas oavkortad.
**Varför:** Nu när beskrivningen uppmuntras vara längre (textarea) blir tabellrader flera rader höga och skanningsbarheten försvinner.
**Förslag:** `line-clamp-2` på beskrivningscellen via `columns`-konfigen i `resources.ts` (en `renderColumn` med `className="line-clamp-2"`), full text i redigeringsvyn.

### 4.4 ⚪ Sonner utan position vald
**Var:** `admin/src/layouts/app/app-layout.component.tsx` — `<Toaster richColors closeButton />`.
**Varför:** Default är nere till höger, vilket krockar visuellt med tabellpagineringen som också bor där.
**Förslag:** `position="top-right"` — bort från pagineringen och närmare där blicken är efter en spara-åtgärd.

## 5. Tillgänglighet

### 5.1 🟡 Skip-länken flyttar inte fokus
**Var:** `admin/src/layouts/main/main.component.tsx` — `<main id="content">` saknar `tabIndex={-1}`; `default-layout` gör `contentElement?.focus()`.
**Varför:** `focus()` på ett element utan tabIndex är en no-op, så "Hoppa till innehåll" scrollar men lämnar fokus kvar i navigationen — WCAG 2.4.1-brist som funnits sedan före migreringen.
**Förslag:** `tabIndex={-1}` på main-elementet. En rad.

### 5.2 ⚪ Listbyten annonseras inte
**Var:** Filtrering/paginering i tabellen uppdaterar DOM tyst (pagineringstexten har `aria-live`, själva resultatet inte).
**Förslag:** `aria-live="polite"` på en osynlig resultaträknare ("53 träffar") kopplad till filterfältet. Lågt hängande.

## 6. Tester och CI

### 6.1 🔴 Ingen CI kör admin
**Var:** `.github/workflows/playwright.yml` triggar enbart på `frontend/**`; admin har två vitest-filer och inget mer.
**Varför:** Praktiskt taget varje fel som hittades under migreringen och designgranskningen var **tyst** — fel spacing, svävande knappar, dold meny, stale cache. Varken tsc, eslint eller next build reagerar på någon av dem. Utan CI som ens kör `type-check && lint && build && test` för admin är regressionsrisken vid nästa PR stor; utan browser-smoke förblir hela UI-klassen av fel osynlig.
**Förslag i två steg:**
1. Utöka CI-matrisen med admin: `type-check`, `lint`, `build`, `test` (billigt, fångar kontraktsbrott).
2. Tre Playwright-smokes mot docker-stacken: logga in → `/users` renderar tabell → skapa/ta bort grupp. Frontend har redan Playwright-uppsättningen att kopiera.

### 6.2 ⚪ RSA-nyckelgenerering per testkörning
**Var:** `backend/vitest.setup.ts` genererar ett 2048-bitars nyckelpar vid varje körning.
**Varför:** Sekundkostnad per körning och icke-deterministiskt. Marginellt idag.
**Förslag:** Generera en gång och återanvänd via testfixtur om testtiden börjar störa.

## 7. Bygge och beroenden

### 7.1 🟡 Sass `@import` försvinner i Dart Sass 3
**Var:** `admin/src/styles/tailwind.scss` — varje bygge spyr deprecationsvarningar.
**Varför:** Varningarna dränker riktiga problem i byggloggen idag och blir hårda fel den dag sass bumpas till 3.x. Fällan: Sass kräver alla `@use` överst — dagens fil har CSS-block mellan importerna, så det är inte en ren sök-och-ersätt.
**Förslag:** Flytta tokens-/basblocken till en egen partial så filen blir `@use`-kompatibel. Gör det som egen liten PR — den är lätt att granska och omöjlig att göra "i förbifarten".

### 7.2 ⚪ Hoisting-känslig Dockerfile-workaround
**Var:** `admin/Dockerfile` — kopierar `node_modules/@swc` för att Next 16:s standalone-tracer missar helpers.
**Varför:** Redan bitit en gång (bygget föll när shadcn-beroendena ändrade yarns hoisting). Nuvarande form överlever båda layouterna, men workarounden bör försvinna när Next fixar tracingen.
**Förslag:** Lämna kvar med kommentaren, men testa att ta bort den vid nästa Next-bump.

### 7.3 ⚪ Kvarvarande `data-cy`-attribut utan testrunner
**Var:** `login.tsx` (`data-cy="loginButton"`), `default-layout` (`data-cy="systemMessage-a"`).
**Varför:** Cypress är borttaget; attributen är döda. Ofarliga — men om Playwright-smokes införs (6.1), standardisera på `data-testid` och återanvänd dem där.

## Medvetna val som INTE ska "åtgärdas"

För tydlighet — följande ser ut som fynd men är simulatorns syfte, och dokumenteras redan i `CLAUDE.md`/README:

- **Klartextlösenord** i DB, UI (bakom feature-flagga + öga) och export
- **RSA-SHA1**-signerade assertions (paritet med gamla fake-idp; kontraktstest finns)
- **Användaruppräkning** via `SAML_IDP_ENUMERATE_USERS`
- **En enda nyckelpar** för både SP- och IdP-rollen

Inhägnaden (2.2) är rätt åtgärd, inte kryptohärdning.

---

*Fixat under samma granskning (finns i git-historiken på `integration/next`, se respektive commit för detaljer): sidebar-ikoner + Draken-loggan, responsiva överlapp (statiska verktygsrader, min-h-header, svh), formulärlayouten på `[resource]/[id]`, stale-cache-buggen i `use-resource`, lösenordsögat, flerradig gruppbeskrivning och enkolumnig gruppväljare.*
