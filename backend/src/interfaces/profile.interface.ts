import { Profile as SamlProfile } from '@node-saml/passport-saml';

export interface Profile extends SamlProfile {
  citizenIdentifier: string;
  givenName: string;
  surname: string;
  username: string;
  groups?: string | string[];
  attributes: { [key: string]: any };
}
