import { htmlEscape } from './util';

const TITLE = 'Fake IdP';

/**
 * shadcn/ui:s designspråk (samma slate-tokens, radie och typografi som
 * adminpanelen) uttryckt som ren CSS — sidorna MÅSTE förbli server-renderade
 * eftersom SAML-POST-flödet, CSRF-skyddet och IdP-sessionen bor här. Mörkt läge
 * följer systemet via prefers-color-scheme, precis som adminens .dark-block.
 * Raleway laddas från adminens /fonts under samma origin (via proxyn); utan den
 * faller sidan tillbaka på systemtypsnitt.
 */
const tokens = (assetsUrl: string) => `
@font-face{font-family:'Raleway';src:url('${assetsUrl}/fonts/Raleway-VariableFont_wght.ttf') format('truetype-variations');font-weight:100 1000;font-display:swap}
:root{
  --background:0 0% 100%;--foreground:222.2 84% 4.9%;
  --card:0 0% 100%;--card-foreground:222.2 84% 4.9%;
  --muted:210 40% 96.1%;--muted-foreground:215.4 16.3% 46.9%;
  --border:214.3 31.8% 91.4%;--input:214.3 31.8% 91.4%;
  --primary:222.2 47.4% 11.2%;--primary-foreground:210 40% 98%;
  --secondary:210 40% 96.1%;--secondary-foreground:222.2 47.4% 11.2%;
  --destructive:0 84.2% 60.2%;--ring:222.2 84% 4.9%;--radius:.5rem;
  color-scheme:light}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]){
  --background:222.2 84% 4.9%;--foreground:210 40% 98%;
  --card:222.2 84% 4.9%;--card-foreground:210 40% 98%;
  --muted:217.2 32.6% 17.5%;--muted-foreground:215 20.2% 65.1%;
  --border:217.2 32.6% 17.5%;--input:217.2 32.6% 17.5%;
  --primary:210 40% 98%;--primary-foreground:222.2 47.4% 11.2%;
  --secondary:217.2 32.6% 17.5%;--secondary-foreground:210 40% 98%;
  --destructive:0 62.8% 30.6%;--ring:212.7 26.8% 83.9%;
  color-scheme:dark}}
:root[data-theme=dark]{
  --background:222.2 84% 4.9%;--foreground:210 40% 98%;
  --card:222.2 84% 4.9%;--card-foreground:210 40% 98%;
  --muted:217.2 32.6% 17.5%;--muted-foreground:215 20.2% 65.1%;
  --border:217.2 32.6% 17.5%;--input:217.2 32.6% 17.5%;
  --primary:210 40% 98%;--primary-foreground:222.2 47.4% 11.2%;
  --secondary:217.2 32.6% 17.5%;--secondary-foreground:210 40% 98%;
  --destructive:0 62.8% 30.6%;--ring:212.7 26.8% 83.9%;
  color-scheme:dark}`;

const STYLE = `
*{box-sizing:border-box;border-color:hsl(var(--border))}
body{margin:0;min-height:100vh;background:hsl(var(--background));color:hsl(var(--foreground));font-family:'Raleway',system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.5}
a{color:inherit}
.topbar{border-bottom:1px solid hsl(var(--border));background:hsl(var(--card))}
.shell{width:min(100% - 32px,760px);margin:0 auto}
.topbar-inner{min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.topbar-actions{display:flex;align-items:center;gap:8px}
.theme-toggle{gap:8px}
.theme-toggle svg{width:15px;height:15px;flex:none}
.theme-mode{display:inline-flex;align-items:center;gap:8px}
.brand{display:flex;align-items:baseline;gap:10px;font-weight:700;text-decoration:none}
.brand-context{color:hsl(var(--muted-foreground));font-size:.78rem;font-weight:600}
main{padding:40px 0 64px}
.surface{padding:24px;background:hsl(var(--card));color:hsl(var(--card-foreground));border:1px solid hsl(var(--border));border-radius:var(--radius);box-shadow:0 1px 2px 0 rgb(0 0 0/.05)}
h1{font-size:1.5rem;line-height:1.25;margin:.35rem 0 .5rem;font-weight:700}
.context{margin:0;color:hsl(var(--muted-foreground));font-size:.78rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.description{margin:.25rem 0 0;color:hsl(var(--muted-foreground));font-size:.925rem}
.target,.identity{padding:14px 0;margin:18px 0;border-top:1px solid hsl(var(--border));border-bottom:1px solid hsl(var(--border))}
.target-label,.identity dt{display:block;color:hsl(var(--muted-foreground));font-size:.78rem}
.target-name{display:block;margin:4px 0;font-size:1.02rem;font-weight:600}
.target-url{display:block;font-size:.78rem;color:hsl(var(--muted-foreground));overflow-wrap:anywhere}
.identity{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:8px 20px}
.identity dd{margin:0;font-weight:600;overflow-wrap:anywhere}
.identity .missing{font-weight:400;font-style:italic;color:hsl(var(--muted-foreground))}
fieldset{border:0;margin:16px 0 0;padding:0;min-width:0}
label{display:block;margin:12px 0 6px;font-weight:600;font-size:.9rem}
input[type=text],input[type=password],input[type=search],select{width:100%;min-height:40px;padding:8px 12px;border:1px solid hsl(var(--input));border-radius:calc(var(--radius) - 2px);background:transparent;color:inherit;font:inherit;font-size:.925rem}
input:focus-visible,select:focus-visible,button:focus-visible,a:focus-visible,.identity-option:has(input:focus-visible){outline:2px solid hsl(var(--ring));outline-offset:2px}
.filters{display:grid;grid-template-columns:1fr;gap:10px;margin:16px 0 10px}
@media(min-width:560px){.filters{grid-template-columns:1fr 220px}}
.filters label{margin:0 0 4px;font-size:.8rem;color:hsl(var(--muted-foreground))}
.identity-list{margin:6px 0 0;max-height:340px;overflow-y:auto;border:1px solid hsl(var(--border));border-radius:calc(var(--radius) - 2px);display:flex;flex-direction:column}
.identity-option{display:flex;align-items:center;gap:12px;padding:10px 12px;border-bottom:1px solid hsl(var(--border));cursor:pointer;margin:0;font-weight:400}
.identity-option:last-child{border-bottom:0}
.identity-option:hover{background:hsl(var(--muted))}
.identity-option:has(input:checked){background:hsl(var(--muted))}
.identity-option input{accent-color:hsl(var(--primary));width:16px;height:16px;flex:none}
.io-text{min-width:0;display:flex;flex-direction:column;gap:1px}
.io-name{font-weight:600;font-size:.925rem}
.io-user{color:hsl(var(--muted-foreground));font-size:.8rem;overflow-wrap:anywhere}
.io-apps{margin-left:auto;display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.badge{padding:1px 8px;border:1px solid hsl(var(--border));border-radius:9999px;background:hsl(var(--secondary));color:hsl(var(--secondary-foreground));font-size:.7rem;font-weight:600;white-space:nowrap}
.count{margin:8px 0 0;color:hsl(var(--muted-foreground));font-size:.8rem}
.disclosure{margin:18px 0 0;border:1px solid hsl(var(--border));border-radius:calc(var(--radius) - 2px);background:hsl(var(--card))}
.disclosure summary{display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;font-weight:600;font-size:.925rem;list-style:none}
.disclosure summary::-webkit-details-marker{display:none}
.disclosure summary::before{content:'';width:6px;height:6px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(-45deg);transition:transform .15s ease;flex:none;margin:0 2px}
.disclosure[open] summary::before{transform:rotate(45deg)}
.disclosure summary:hover{background:hsl(var(--muted))}
.disclosure summary .badge{margin-left:auto}
.group-list{margin:0;padding:0 14px 12px;list-style:none;display:flex;flex-direction:column;gap:10px;border-top:1px solid hsl(var(--border));padding-top:12px}
.group-name{display:block;font-weight:600;font-size:.9rem;overflow-wrap:anywhere}
.group-desc{display:block;color:hsl(var(--muted-foreground));font-size:.85rem}
.group-empty{margin:18px 0 0;color:hsl(var(--muted-foreground));font-size:.9rem}
.empty-filter{margin:14px 0 0;padding:12px;border:1px dashed hsl(var(--border));border-radius:calc(var(--radius) - 2px);color:hsl(var(--muted-foreground));font-size:.9rem}
.actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:20px}
.inline-form{display:inline-flex;margin:0}
button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:8px 16px;border:1px solid transparent;border-radius:calc(var(--radius) - 2px);font:inherit;font-size:.925rem;font-weight:600;cursor:pointer;text-decoration:none}
.primary{color:hsl(var(--primary-foreground));background:hsl(var(--primary))}
.primary:hover{opacity:.9}
.primary:disabled{opacity:.5;cursor:not-allowed}
.secondary{color:hsl(var(--secondary-foreground));background:hsl(var(--secondary));border-color:hsl(var(--border))}
.secondary:hover{opacity:.85}
.error,.notice{padding:10px 14px;margin:16px 0 0;border:1px solid;border-radius:calc(var(--radius) - 2px);font-size:.9rem}
.error{color:hsl(var(--destructive));border-color:hsl(var(--destructive))}
.error strong{display:block;margin-bottom:4px}
.error-code{display:block;margin-top:6px;font-size:.78rem;opacity:.85}
.steps{margin:18px 0 0;padding:14px 18px 14px 32px;border:1px solid hsl(var(--border));border-radius:calc(var(--radius) - 2px);background:hsl(var(--muted));color:hsl(var(--muted-foreground));font-size:.875rem}
.steps li+li{margin-top:6px}
.steps-title{margin:0 0 6px;font-weight:600;font-size:.875rem;color:hsl(var(--foreground))}
.notice{border-color:hsl(var(--border));background:hsl(var(--muted))}
[hidden]{display:none!important}
@media(max-width:520px){.surface{padding:18px 16px}.theme-toggle .theme-mode span{display:none}.actions,.actions>*{width:100%}.inline-form button{width:100%}.io-apps{display:none}}`;

export interface PageNavigation {
  idpUrl: string;
  adminUrl: string;
  /** Bas-URL där adminens statiska filer (t.ex. /fonts) kan nås. */
  assetsUrl?: string;
}

/** Sätter valt tema före första målningen så sidan inte blinkar. */
const THEME_BOOT_SCRIPT = `(function(){try{var v=localStorage.getItem('fake-idp-theme');if(v==='light'||v==='dark')document.documentElement.setAttribute('data-theme',v)}catch(e){}})();`;

const THEME_ICONS = {
  system:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
  light:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
} as const;

/** Trelägescykel (system → ljust → mörkt), samma modell som adminens färglägesmeny. */
const THEME_TOGGLE_SCRIPT = `
(function(){
  var KEY='fake-idp-theme';
  var btn=document.getElementById('themeToggle');
  if(!btn)return;
  var order=['system','light','dark'];
  var labels={system:'Följ system',light:'Ljust läge',dark:'Mörkt läge'};
  function current(){var v=localStorage.getItem(KEY);return v==='light'||v==='dark'?v:'system'}
  function apply(mode){
    if(mode==='system'){document.documentElement.removeAttribute('data-theme');localStorage.removeItem(KEY)}
    else{document.documentElement.setAttribute('data-theme',mode);localStorage.setItem(KEY,mode)}
    [].forEach.call(btn.querySelectorAll('[data-mode]'),function(el){el.hidden=el.getAttribute('data-mode')!==mode});
    btn.setAttribute('aria-label','Färgläge: '+labels[mode]+'. Klicka för att byta.');
    btn.title=labels[mode];
  }
  btn.addEventListener('click',function(){apply(order[(order.indexOf(current())+1)%order.length])});
  apply(current());
})();`;

const themeToggle = (): string =>
  `<button class="button secondary theme-toggle" id="themeToggle" type="button">` +
  (['system', 'light', 'dark'] as const)
    .map(
      mode =>
        `<span class="theme-mode" data-mode="${mode}"${mode === 'system' ? '' : ' hidden'}>${THEME_ICONS[mode]}` +
        `<span>${mode === 'system' ? 'Följ system' : mode === 'light' ? 'Ljust läge' : 'Mörkt läge'}</span></span>`,
    )
    .join('') +
  `</button>`;

const page = (body: string, navigation: PageNavigation): string =>
  `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${TITLE}</title>` +
  `<script>${THEME_BOOT_SCRIPT}</script>` +
  `<style>${tokens(htmlEscape(navigation.assetsUrl ?? navigation.adminUrl))}${STYLE}</style></head>` +
  `<body><header class="topbar"><div class="shell topbar-inner">` +
  `<a class="brand" href="${htmlEscape(navigation.idpUrl)}"><span>${TITLE}</span><span class="brand-context">Testläge</span></a>` +
  `<div class="topbar-actions">${themeToggle()}` +
  `<nav aria-label="Huvudnavigation"><a class="button secondary" href="${htmlEscape(navigation.adminUrl)}">Administration</a></nav></div>` +
  `</div></header><main class="shell"><section class="surface">${body}</section></main>` +
  `<script>${THEME_TOGGLE_SCRIPT}</script></body></html>`;

export interface LoginUser {
  id: string;
  name: string;
  username: string;
  /** Anslutna applikationer (namn) — driver applikationsfiltret. */
  applications?: string[];
}

export interface LoginTarget {
  name: string;
  url: string;
}

export interface IdentitySummary {
  name: string;
  /** Kan saknas: den lokala test-SP:n läser den ur assertionen, som inte måste innehålla den. */
  username?: string;
}

/** Dokumenterad grupp som testidentiteten tillhör. */
export interface IdentityGroup {
  name: string;
  description?: string;
}

/**
 * Grupperna som testsessionen skickar med i SAML-svaret, hopfällda bakom en
 * <details> — namnet räcker sällan för att avgöra vad gruppen ger, så
 * beskrivningen (gruppens dokumentation i adminpanelen) visas under den.
 */
const identityGroups = (groups: IdentityGroup[]): string => {
  if (groups.length === 0) {
    return `<p class="group-empty">Testidentiteten tillhör inga grupper.</p>`;
  }

  return (
    `<details class="disclosure"><summary>Grupper och behörigheter<span class="badge">${groups.length}</span></summary>` +
    `<ul class="group-list">` +
    groups
      .map(
        group =>
          `<li><span class="group-name">${htmlEscape(group.name)}</span>` +
          (group.description ? `<span class="group-desc">${htmlEscape(group.description)}</span>` : '') +
          `</li>`,
      )
      .join('') +
    `</ul></details>`
  );
};

/** Tomt värde ska säga att uppgiften saknas — inte renderas som "undefined". */
const identityValue = (value?: string): string => (value ? htmlEscape(value) : `<span class="missing">saknas i SAML-svaret</span>`);

const identityDetails = (identity: IdentitySummary, label = 'Aktiv testidentitet'): string =>
  `<dl class="identity"><dt>${htmlEscape(label)}</dt><dd>${identityValue(identity.name)}</dd>` +
  `<dt>Användarnamn</dt><dd>${identityValue(identity.username)}</dd></dl>`;

/**
 * Klientfiltret: fritextsök på namn/användarnamn + applikationsfilter.
 * Ren klass-toggling — ingen HTML byggs från data i webbläsaren, så
 * escaping-ansvaret ligger kvar på servern. CSP tillåter inline-script.
 */
const FILTER_SCRIPT = `
(function(){
  var search=document.getElementById('identitySearch');
  var app=document.getElementById('appFilter');
  if(!search&&!app)return;
  var options=[].slice.call(document.querySelectorAll('.identity-option'));
  var empty=document.getElementById('emptyFilter');
  var count=document.getElementById('identityCount');
  var submit=document.getElementById('identitySubmit');
  var total=options.length;
  function apply(){
    var q=(search&&search.value||'').trim().toLowerCase();
    var a=(app&&app.value)||'';
    var visible=0,firstVisible=null,checkedVisible=false;
    options.forEach(function(option){
      var hit=(!q||option.getAttribute('data-search').indexOf(q)!==-1)&&
              (!a||('|'+option.getAttribute('data-apps')+'|').indexOf('|'+a+'|')!==-1);
      option.hidden=!hit;
      if(hit){visible++;if(!firstVisible)firstVisible=option;
        if(option.querySelector('input').checked)checkedVisible=true;}
    });
    if(!checkedVisible&&firstVisible)firstVisible.querySelector('input').checked=true;
    if(empty)empty.hidden=visible!==0;
    if(submit)submit.disabled=visible===0;
    if(count)count.textContent=visible===total?total+' testidentiteter':visible+' av '+total+' testidentiteter';
  }
  if(search)search.addEventListener('input',apply);
  if(app)app.addEventListener('change',apply);
  apply();
})();`;

const identityPicker = (users: LoginUser[]): string => {
  const applicationNames = [...new Set(users.flatMap(user => user.applications ?? []))].sort((a, b) => a.localeCompare(b, 'sv'));

  const filters =
    `<div class="filters">` +
    `<div><label for="identitySearch">Sök testidentitet</label>` +
    `<input type="search" id="identitySearch" placeholder="Namn eller användarnamn" autocomplete="off" /></div>` +
    (applicationNames.length > 0
      ? `<div><label for="appFilter">Applikation</label><select id="appFilter">` +
        `<option value="">Alla applikationer</option>` +
        applicationNames.map(name => `<option value="${htmlEscape(name)}">${htmlEscape(name)}</option>`).join('') +
        `</select></div>`
      : '') +
    `</div>`;

  const rows = users
    .map((user, index) => {
      const badges = (user.applications ?? []).map(name => `<span class="badge">${htmlEscape(name)}</span>`).join('');
      return (
        `<label class="identity-option" data-search="${htmlEscape(`${user.name} ${user.username}`.toLowerCase())}"` +
        ` data-apps="${htmlEscape((user.applications ?? []).join('|'))}">` +
        `<input type="radio" name="userid" value="${htmlEscape(user.id)}"${index === 0 ? ' checked' : ''} />` +
        `<span class="io-text"><span class="io-name">${htmlEscape(user.name)}</span>` +
        `<span class="io-user">${htmlEscape(user.username)}</span></span>` +
        (badges ? `<span class="io-apps">${badges}</span>` : '') +
        `</label>`
      );
    })
    .join('');

  return (
    filters +
    `<fieldset role="radiogroup" aria-label="Testidentitet"><div class="identity-list">${rows}</div></fieldset>` +
    `<p class="empty-filter" id="emptyFilter" hidden>Inga testidentiteter matchar filtret.</p>` +
    `<p class="count" id="identityCount" aria-live="polite"></p>`
  );
};

export function renderLogin(opts: {
  action: string;
  csrfToken: string;
  navigation: PageNavigation;
  users: LoginUser[];
  enumerateUsers: boolean;
  target?: LoginTarget;
  error?: string;
  notice?: string;
}): string {
  const errorHtml = opts.error ? `<p class="error" role="alert">${htmlEscape(opts.error)}</p>` : '';
  const noticeHtml = opts.notice ? `<p class="notice" role="status">${htmlEscape(opts.notice)}</p>` : '';
  const hasUsers = !opts.enumerateUsers || opts.users.length > 0;
  const targetHtml = opts.target
    ? `<div class="target"><span class="target-label">Fortsätt till</span><strong class="target-name">${htmlEscape(opts.target.name)}</strong>` +
      `<code class="target-url">${htmlEscape(opts.target.url)}</code></div>`
    : '';

  const credentials = opts.enumerateUsers
    ? opts.users.length > 0
      ? identityPicker(opts.users)
      : `<p class="error">Det finns inga testidentiteter. Skapa en i adminpanelen först.</p>`
    : `<label for="username">Användarnamn</label><input type="text" id="username" name="username" autocomplete="username" required />` +
      `<label for="password">Lösenord</label><input type="password" id="password" name="password" autocomplete="current-password" required />`;

  return page(
    `<p class="context">${opts.target ? 'SAML-testinloggning' : 'Testsession'}</p>` +
      `<h1>Välj testidentitet</h1>` +
      `<p class="description">${
        opts.target
          ? 'Välj vilken identitet den anslutna testapplikationen ska ta emot.'
          : 'Välj den identitet som ska användas vid kommande SAML-inloggningar.'
      }</p>` +
      targetHtml +
      noticeHtml +
      errorHtml +
      `<form action="${htmlEscape(opts.action)}" method="POST">` +
      `<input type="hidden" name="_csrf" value="${htmlEscape(opts.csrfToken)}" />` +
      `${credentials}` +
      `<div class="actions"><button class="primary" id="identitySubmit" type="submit"${hasUsers ? '' : ' disabled'}>${
        opts.target ? 'Logga in och fortsätt' : 'Logga in som testidentitet'
      }</button></div>` +
      `</form>` +
      (opts.enumerateUsers && opts.users.length > 0 ? `<script>${FILTER_SCRIPT}</script>` : ''),
    opts.navigation,
  );
}

export function renderIdentitySession(opts: {
  identity: IdentitySummary;
  groups?: IdentityGroup[];
  csrfToken: string;
  navigation: PageNavigation;
  logoutAction: string;
}): string {
  return page(
    `<p class="context">Aktiv testsession</p>` +
      `<h1>Inloggad som ${htmlEscape(opts.identity.name)}</h1>` +
      `<p class="description">Testidentiteten används automatiskt när en ansluten applikation startar en SAML-inloggning.</p>` +
      identityDetails(opts.identity) +
      identityGroups(opts.groups ?? []) +
      `<div class="actions"><form class="inline-form" action="${htmlEscape(opts.logoutAction)}" method="POST">` +
      `<input type="hidden" name="_csrf" value="${htmlEscape(opts.csrfToken)}" />` +
      `<button class="secondary" type="submit">Logga ut testidentitet</button></form></div>`,
    opts.navigation,
  );
}

/** Attributen den lokala test-SP:n kräver av en assertion (se app.ts). */
const REQUIRED_TEST_ATTRIBUTES = 'givenName, surname och citizenIdentifier';

/**
 * Översätter felkoden från SAML-callbacken till något en operatör kan agera på.
 * Koden visas fortfarande i klartext — den är det som går att söka på i loggarna.
 */
const samlTestError = (error: string, missingAttributes?: string[]): string => {
  const explanations: Record<string, string> = {
    SAML_MISSING_ATTRIBUTES:
      (missingAttributes?.length
        ? `Testidentiteten saknar attributen ${htmlEscape(missingAttributes.join(', '))}. `
        : 'Testidentiteten saknar attribut som testapplikationen kräver. ') +
      `Den här testapplikationen kräver ${REQUIRED_TEST_ATTRIBUTES} — fyll i dem under "Kända identitetsattribut" på testidentiteten i adminpanelen och testa igen. ` +
      'Inloggningen i sig fungerade: assertion signerades och togs emot. Anslutna applikationer kan kräva andra attribut än den här.',
    SAML_MISSING_PROFILE: 'Svaret från IdP:n innehöll ingen identitet.',
    NO_USER: 'Svaret togs emot men ingen identitet kunde skapas ur det.',
    SAML_UNKNOWN_ERROR: 'Inloggningen avbröts utan närmare orsak. Kontrollera backendens logg.',
  };
  const explanation = explanations[error] ?? 'Kontrollera backendens logg för detaljer.';

  return (
    `<p class="error" role="alert"><strong>SAML-inloggningen misslyckades</strong>${explanation}` +
    `<span class="error-code">Felkod: ${htmlEscape(error)}</span></p>`
  );
};

const SAML_TEST_DESCRIPTION =
  'Det här är backendens egen testapplikation (Service Provider). Den kör ett riktigt SAML-flöde mot den här IdP:n och visar vilka uppgifter applikationen fick tillbaka — ett sätt att kontrollera signering, attribut och session utan att koppla in en riktig applikation.';

const SAML_TEST_STEPS =
  `<div class="steps"><p class="steps-title">Så går testet till</p><ol>` +
  `<li>Du skickas till IdP:ns inloggning — eller vidare direkt om en testidentitet redan är vald.</li>` +
  `<li>IdP:n signerar en SAML-assertion och postar tillbaka den hit.</li>` +
  `<li>Sidan visar identiteten som testapplikationen tog emot.</li>` +
  `</ol></div>`;

export function renderSamlTest(opts: {
  identity?: IdentitySummary;
  navigation: PageNavigation;
  samlLoginUrl: string;
  error?: string;
  missingAttributes?: string[];
}): string {
  const errorHtml = opts.error ? samlTestError(opts.error, opts.missingAttributes) : '';

  if (!opts.identity) {
    return page(
      `<p class="context">Lokal testapplikation</p>` +
        `<h1>Testa SAML-inloggning</h1>` +
        `<p class="description">${SAML_TEST_DESCRIPTION}</p>` +
        errorHtml +
        SAML_TEST_STEPS +
        `<div class="actions"><a class="button primary" href="${htmlEscape(opts.samlLoginUrl)}">Starta SAML-test</a>` +
        `<a class="button secondary" href="${htmlEscape(opts.navigation.idpUrl)}">Öppna testsession</a></div>`,
      opts.navigation,
    );
  }

  return page(
    `<p class="context">Lokal testapplikation</p>` +
      `<h1>SAML-inloggningen lyckades</h1>` +
      `<p class="description">Testapplikationen tog emot följande identitet från Fake IdP.</p>` +
      identityDetails(opts.identity, 'Mottagen identitet') +
      `<div class="actions"><a class="button primary" href="${htmlEscape(opts.samlLoginUrl)}">Testa igen</a>` +
      `<a class="button secondary" href="${htmlEscape(opts.navigation.idpUrl)}">Hantera testsession</a></div>`,
    opts.navigation,
  );
}

export function renderPostResponse(opts: { action: string; samlResponse: string; relayState?: string }): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><title>${TITLE}</title></head>` +
    `<body onload="document.forms[0].submit()">` +
    `<form action="${htmlEscape(opts.action)}" method="POST">` +
    `<input type="hidden" name="SAMLResponse" value="${htmlEscape(opts.samlResponse)}" />` +
    `<input type="hidden" name="RelayState" value="${htmlEscape(opts.relayState || '')}" />` +
    `</form></body></html>`
  );
}
