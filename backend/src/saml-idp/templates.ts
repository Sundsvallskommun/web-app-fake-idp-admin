import type { UserWithAttributes } from './response-builder';
import { htmlEscape } from './util';

const TITLE = 'Fake SSO IDP';

// Minimal inline styling (the original linked purecss via express.static, which
// this backend does not serve).
const STYLE = `body{padding:50px;font-family:system-ui,sans-serif;max-width:32rem}
    h1{font-size:1.4rem}
    label{display:block;margin:.75rem 0 .25rem}
    input,select{width:100%;padding:.5rem;box-sizing:border-box}
    button{margin-top:1rem;padding:.5rem 1rem;cursor:pointer}
    .error{color:#b00020;margin:.5rem 0}`;

const page = (body: string): string =>
  `<!doctype html><html><head><meta charset="utf-8"><title>${TITLE}</title><style>${STYLE}</style></head><body>${body}</body></html>`;

export interface LoginUser {
  id: string;
  username: string;
}

export function renderLogin(opts: { action: string; users: LoginUser[]; enumerateUsers: boolean; error?: string }): string {
  const errorHtml = opts.error ? `<p class="error">${htmlEscape(opts.error)}</p>` : '';

  const credentials = opts.enumerateUsers
    ? `<label for="userId">Select user</label>` +
      `<select name="userid" id="userId">` +
      opts.users.map(u => `<option value="${htmlEscape(u.id)}">${htmlEscape(u.username)}</option>`).join('') +
      `</select>`
    : `<label for="username">Username</label><input type="text" id="username" name="username" />` +
      `<label for="password">Password</label><input type="password" id="password" name="password" />`;

  return page(
    `<form action="${htmlEscape(opts.action)}" method="POST">` +
      `<h1>${TITLE}</h1>` +
      errorHtml +
      `<fieldset name="credentials">${credentials}<button type="submit">Log in</button></fieldset>` +
      `</form>`,
  );
}

export function renderDetails(opts: { user: UserWithAttributes; logoutAction: string }): string {
  const groups = opts.user.attributes.find(a => a.key === 'groups')?.value || 'No groups';
  return page(
    `<h1>Logged in</h1>` +
      `<p>Logged in as: ${htmlEscape(opts.user.name || opts.user.username)}</p>` +
      `<p>Groups: ${htmlEscape(groups)}</p>` +
      `<form action="${htmlEscape(opts.logoutAction)}" method="GET"><button type="submit">Log out</button></form>`,
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
