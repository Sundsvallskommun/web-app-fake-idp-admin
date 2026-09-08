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
    adminUser?: { name: string; username: string; defaultCredentials?: boolean };
    // IdP role: the selected test identity and any AuthnRequest awaiting an assertion.
    idpIdentityId?: string;
    idpPasswordVerified?: boolean;
    idpRequest?: { destination: string; inResponseTo: string; relayState?: string };
  }
}
