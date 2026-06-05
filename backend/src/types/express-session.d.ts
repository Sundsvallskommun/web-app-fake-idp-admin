import { User } from '@/interfaces/users.interface';
interface Engagement {
  organizationName: string;
  organizationNumber: string;
  organizationId: string;
}

declare module 'express-session' {
  interface Session {
    returnTo?: string;
    user?: User;
    representing?: Engagement;
    passport?: any;
    representingChoices?: Engagement[];
    messages: string[];
    // IdP role: the user logged in at this IdP, and the AuthnRequest in flight.
    idpUser?: { id: string };
    idpRequest?: { destination: string; inResponseTo: string; relayState?: string };
  }
}
