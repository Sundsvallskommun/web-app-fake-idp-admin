import { htmlEscape } from './util';

const TITLE = 'Fake IdP';

const STYLE = `:root{color-scheme:light;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17212b;background:#f3f5f7}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;background:#f3f5f7}
    a{color:inherit}
    .topbar{background:#fff;border-bottom:1px solid #d8dde3}
    .shell{width:min(100% - 32px,720px);margin:0 auto}
    .topbar-inner{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .brand{display:flex;align-items:baseline;gap:10px;color:#17212b;font-weight:750;text-decoration:none}
    .brand-context{color:#52606d;font-size:.78rem;font-weight:600}
    .admin-link{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border:1px solid #8c98a4;border-radius:3px;color:#17212b;font-size:.9rem;font-weight:650;text-decoration:none}
    .admin-link:hover{background:#f3f5f7}
    main{padding:40px 0 64px}
    .surface{padding:32px;background:#fff;border:1px solid #d8dde3;border-top:4px solid #005595;border-radius:4px}
    h1{font-size:1.7rem;line-height:1.25;margin:.4rem 0 .75rem;letter-spacing:0}
    .context{margin:0;color:#005595;font-size:.76rem;font-weight:750;text-transform:uppercase}
    .description,.target-url{color:#52606d;line-height:1.55}
    .target,.identity{padding:16px 0;margin:22px 0;border-top:1px solid #d8dde3;border-bottom:1px solid #d8dde3}
    .target-label,.identity dt{display:block;color:#52606d;font-size:.78rem;font-weight:500}
    .target-name{display:block;margin:4px 0;font-size:1.05rem}
    .target-url{display:block;font-size:.8rem;overflow-wrap:anywhere}
    .identity{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:10px 20px}
    .identity dd{margin:0;font-weight:650;overflow-wrap:anywhere}
    fieldset{border:0;margin:22px 0 0;padding:0}
    label{display:block;margin:12px 0 6px;font-weight:650}
    input,select{width:100%;min-height:44px;padding:10px;border:1px solid #7d8995;border-radius:2px;background:#fff;color:#17212b;font:inherit}
    input:focus,select:focus,button:focus,a:focus{outline:3px solid #8ec5ed;outline-offset:2px}
    .actions{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:24px}
    .inline-form{display:inline-flex;margin:0}
    button,.button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border:1px solid transparent;border-radius:3px;font:inherit;font-weight:650;cursor:pointer;text-decoration:none}
    .primary{color:#fff;background:#005595}.primary:hover{background:#003f70}.primary:disabled{background:#8b929c;cursor:not-allowed}
    .secondary{color:#17212b;background:#fff;border-color:#7d8995}.secondary:hover{background:#eef1f4}
    .error,.notice{padding:12px 14px;margin:18px 0;border-left:3px solid}
    .error{color:#8b1d1d;background:#fff1f1;border-color:#c53030}
    .notice{color:#234d36;background:#edf8f1;border-color:#2f855a}
    @media(max-width:520px){.shell{width:min(100% - 24px,720px)}.topbar-inner{min-height:58px}.brand-context{display:none}.surface{padding:24px 20px}.actions,.actions>*{width:100%}.inline-form button{width:100%}}`;

export interface PageNavigation {
  idpUrl: string;
  adminUrl: string;
}

const page = (body: string, navigation: PageNavigation): string =>
  `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${TITLE}</title><style>${STYLE}</style></head>` +
  `<body><header class="topbar"><div class="shell topbar-inner">` +
  `<a class="brand" href="${htmlEscape(navigation.idpUrl)}"><span>${TITLE}</span><span class="brand-context">Testläge</span></a>` +
  `<nav aria-label="Huvudnavigation"><a class="admin-link" href="${htmlEscape(navigation.adminUrl)}">Administration</a></nav>` +
  `</div></header><main class="shell"><section class="surface">${body}</section></main></body></html>`;

export interface LoginUser {
  id: string;
  name: string;
  username: string;
}

export interface LoginTarget {
  name: string;
  url: string;
}

export interface IdentitySummary {
  name: string;
  username: string;
}

const identityDetails = (identity: IdentitySummary, label = 'Aktiv testidentitet'): string =>
  `<dl class="identity"><dt>${htmlEscape(label)}</dt><dd>${htmlEscape(identity.name)}</dd>` +
  `<dt>Användarnamn</dt><dd>${htmlEscape(identity.username)}</dd></dl>`;

export function renderLogin(opts: {
  action: string;
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
      ? `<label for="userId">Testidentitet</label>` +
        `<select name="userid" id="userId">` +
        opts.users.map(user => `<option value="${htmlEscape(user.id)}">${htmlEscape(user.name)} (${htmlEscape(user.username)})</option>`).join('') +
        `</select>`
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
      `<fieldset name="credentials">${credentials}</fieldset>` +
      `<div class="actions"><button class="primary" type="submit"${hasUsers ? '' : ' disabled'}>${
        opts.target ? 'Logga in och fortsätt' : 'Logga in som testidentitet'
      }</button></div>` +
      `</form>`,
    opts.navigation,
  );
}

export function renderIdentitySession(opts: {
  identity: IdentitySummary;
  navigation: PageNavigation;
  logoutAction: string;
  samlLoginUrl: string;
}): string {
  return page(
    `<p class="context">Aktiv testsession</p>` +
      `<h1>Inloggad som ${htmlEscape(opts.identity.name)}</h1>` +
      `<p class="description">Testidentiteten används automatiskt när en ansluten applikation startar en SAML-inloggning.</p>` +
      identityDetails(opts.identity) +
      `<div class="actions"><a class="button primary" href="${htmlEscape(opts.samlLoginUrl)}">Starta lokalt SAML-test</a>` +
      `<form class="inline-form" action="${htmlEscape(opts.logoutAction)}" method="POST"><button class="secondary" type="submit">Logga ut testidentitet</button></form></div>`,
    opts.navigation,
  );
}

export function renderSamlTest(opts: { identity?: IdentitySummary; navigation: PageNavigation; samlLoginUrl: string; error?: string }): string {
  const errorHtml = opts.error ? `<p class="error" role="alert">SAML-inloggningen misslyckades: ${htmlEscape(opts.error)}</p>` : '';

  if (!opts.identity) {
    return page(
      `<p class="context">Lokal testapplikation</p>` +
        `<h1>Testa SAML-inloggning</h1>` +
        `<p class="description">Starta ett lokalt SAML-flöde och kontrollera vilken testidentitet som tas emot.</p>` +
        errorHtml +
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
