/**
 * Build-time feature flags, inlined from NEXT_PUBLIC_* environment variables.
 */
export const features = {
  /**
   * Show the (plain-text) password column in the users list view.
   * Off by default — the password is always editable on the user detail page.
   */
  showUserPasswords: process.env.NEXT_PUBLIC_FEATURE_SHOW_USER_PASSWORDS === 'true',
};
