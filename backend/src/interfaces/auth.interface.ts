export interface DataStoredInToken {
  id: number;
}

export interface TokenData {
  token: string;
  expiresIn: number;
}

// export interface Representing {
//   organizationName: string;
//   organizationNumber: string;
//   organizationId: string;
// }

export interface Permissions {
  canEditSystemMessages: boolean;
}

/** AD roles */
export type ADRole = 'sg_appl_app_admin' | 'sg_appl_app_read';

/** Internal roles */
export type InternalRole = 'app_admin' | 'app_read';
export enum InternalRoleEnum {
  'app_read',
  'app_admin',
}
