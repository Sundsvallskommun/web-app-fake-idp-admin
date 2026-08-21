export type User = {
  // personId: string;
  username: string;
  name: string;
  givenName: string;
  surname: string;
};

export type ClientUser = {
  name: string;
  username: string;
  /** Adminkontot kör kvar på defaultlösenordet — driver varningsbannern i UI:t. */
  defaultCredentials?: boolean;
};
