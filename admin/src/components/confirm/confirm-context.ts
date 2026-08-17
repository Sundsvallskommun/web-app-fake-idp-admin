import * as React from 'react';

export type ConfirmVariant = 'info' | 'error';

export interface ConfirmOptions {
  title: string;
  text: string;
  confirmLabel?: string;
  dismissLabel?: string;
  variant?: ConfirmVariant;
}

export interface ConfirmContextValue {
  showConfirmation: (
    title: string,
    text: string,
    confirmLabel?: string,
    dismissLabel?: string,
    variant?: ConfirmVariant
  ) => Promise<boolean>;
}

export const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

/**
 * Imperativ bekräftelsedialog med samma promise-signatur som `useConfirm` hade i
 * @sk-web-gui. Se `confirm.tsx` för varför API:t inte är deklarativt.
 */
export const useConfirm = (): ConfirmContextValue => {
  const context = React.useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm måste användas inuti en <ConfirmProvider>');
  }
  return context;
};
