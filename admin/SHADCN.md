# Fake IdP Admin – shadcn/ui

Admin-UI:t är byggt med [shadcn/ui](https://ui.shadcn.com) (Radix UI + Tailwind).
**`@sk-web-gui` är helt borttaget** — shadcn är appens enda designsystem.
Förlagan är `web-app-draken-admin` på branchen `poc/shadcn`.

## Köra

Projektet kräver **Node >= 24 < 25** (`engines` i `package.json`). Med nvm:

```bash
nvm use 24
```

Sedan som vanligt: `yarn dev` (port 3002), `yarn build`, `yarn type-check`, `yarn lint`.

## Struktur

- **Tema:** `tailwind.config.js` (shadcn-tema, `style: new-york`, `baseColor: slate`)
  + CSS-variabler i `src/styles/tailwind.scss`.
- **Providers:** `src/layouts/app/app-layout.component.tsx` — next-themes (`ThemeProvider`),
  `ConfirmProvider`, `LoginGuard` och global `Toaster` (sonner).
- **Komponenter:** `src/components/ui/*` är vendorad shadcn-kod. `components.json` pekar på
  projektets egna alias (`@components`, `@utils/cn`), så `npx shadcn add …` fungerar.
  `eslint.config.mjs` har en override för den mappen — filerna ska inte handredigeras.
- **i18n:** oförändrat. `next-i18next`, alla namespaces under `public/locales` och alla
  `getServerSideProps` är kvar precis som tidigare.

## Komponentmappning

| @sk-web-gui | shadcn |
|---|---|
| `GuiProvider` + `ColorSchemeMode` | `next-themes` → `src/components/theme-provider/` |
| `useSnackbar` | `sonner` (`toast.success` / `toast.error`) |
| `useConfirm` | `src/components/confirm/` (AlertDialog med promise-API) |
| `AutoTable` + `AutoTableHeader` | `src/components/list-resources/list-table.tsx` (TanStack Table v8) + `ResourceColumn` i `src/interfaces/resource.ts` |
| `SearchField` | `Input` + lucide `Search` |
| `PopupMenu` | `dropdown-menu` |
| `MenuVertical` | `sidebar` + `collapsible` |
| `FormControl`/`FormLabel`/`Input`/`Switch` | `label` + `input` + `switch` |
| `Button`, `Card`, `Avatar`, `Spinner`, `Icon` | `button`, `card`, `avatar`, lucide `Loader2`, lucide direkt |
| `cx` | `cn` (`src/utils/cn.ts`) |
| `__DEV__` | `process.env.NODE_ENV !== 'production'` |

## Fällan: spacing-skalan

`@sk-web-gui/core`-preseten satte `html { font-size: 0.625em }` (10px-rot) och definierade
spacing-nyckel `N` som `var(--sk-spacing-N)` = `N` px. Värdena injicerades i **runtime** av
`GuiProvider` — de fanns aldrig i någon CSS-fil.

Utan preseten gäller Tailwinds egen skala där 1 enhet = 4px. **Omräkningen är därför N/4:**
`gap-16` → `gap-4`, `p-24` → `p-6`, `md:px-40` → `md:px-10`, `top-40` → `top-10`.

Detsamma gäller hårdkodade rem-värden skrivna för 10px-roten (`h-[9.6rem]` → `h-24`,
`max-w-[32rem]` → `max-w-80`) och Tailwinds egna rem-baserade klasser (`max-w-4xl` var 560px,
blir 896px).

Ingenting av detta fångas av `tsc` eller `next build` — klasserna finns i båda skalorna och
genererar bara annan CSS. Två saker till som försvann tyst:

- `border-b-1` finns **inte** i vanilla Tailwind (heter `border-b`) — kanten försvinner helt.
- Råa klassträngar som `sk-btn sk-btn-sm sk-btn-tertiary` på `<Link>` hittas inte av en
  grep på `@sk-web-gui`. Sök på `sk-` vid framtida städning.
- Alla `h1`–`h6` fick sin typografi ur presetens base-lager. Tailwinds preflight nollställer
  dem, så varje rubrik har fått explicita klasser.

## Kvar att göra

- **Manuell genomgång.** Nästan alla ändringar ovan är visuella och osynliga för typecheck,
  build och lint. Gå igenom `/login`, `/start`, `/users` (sortering, filter, paginering,
  kolumnväljare), `/users/new`, `/users/[id]` (osparade ändringar + radera), ljust/mörkt/system,
  och tabb-ordningen genom menyn. Kör samma runda i docker-stacken under `ADMIN_BASE_PATH`,
  eftersom `NEXT_PUBLIC_*` inlinas vid build.
- **Typsnitt under sub-path.** `public/fonts/fonts.css` använder rot-absoluta `url('/fonts/…')`.
  `next.config.js` injicerar en sass-variabel `$basePath` för detta, men den används inte av
  någon — och kan inte användas så länge filen är `.css` och inte `.scss`. Raleway faller
  därför tyst tillbaka på Arial i den prefixade deployen. Fanns före migreringen.
- **Skip-länken flyttar inte fokus.** `<main id="content">` i `src/layouts/main/main.component.tsx`
  saknar `tabIndex={-1}`, så `focus()` gör ingenting. Fanns före migreringen, lämnad orörd.
- **`handleGetMany` använder fel i18n-nyckel** (`crud:get_one.error` istället för
  `crud:get_many.error`) i `src/utils/use-crud-helpers.ts`. Osynligt eftersom strängarna är
  identiska på svenska. Fanns före migreringen, lämnad orörd.
