import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@components/ui/alert-dialog';
import { buttonVariants } from '@components/ui/button';
import { cn } from '@utils/cn';
import * as React from 'react';
import { ConfirmContext, type ConfirmContextValue, type ConfirmOptions } from './confirm-context';

/**
 * Bekräftelsedialog byggd på shadcns AlertDialog, med ett imperativt
 * promise-API.
 *
 * Anledningen att inte gå deklarativt: `useRouteGuard` måste kunna `await`:a
 * svaret inuti en `routeChangeStart`-lyssnare och kasta för att avbryta
 * navigeringen. Ett rent open/onOpenChange-API kan inte blockera där.
 *
 * OBS: detta är ny funktionalitet, inte en ren port. `useConfirm` i @sk-web-gui
 * krävde en `ConfirmationDialogContextProvider` som aldrig monterades i den här
 * appen, så `showConfirmation` var i praktiken `undefined` — både radera-knappen
 * och osparade-ändringar-varningen kastade TypeError när de nåddes.
 */
export const ConfirmProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = React.useState<ConfirmOptions | null>(null);
  const resolverRef = React.useRef<((value: boolean) => void) | null>(null);

  const showConfirmation = React.useCallback<ConfirmContextValue['showConfirmation']>(
    (title, text, confirmLabel, dismissLabel, variant) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setOptions({ title, text, confirmLabel, dismissLabel, variant });
      }),
    []
  );

  const settle = React.useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const value = React.useMemo(() => ({ showConfirmation }), [showConfirmation]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AlertDialog
        open={options !== null}
        onOpenChange={(open) => {
          // Stängning via Escape eller klick utanför räknas som avbryt.
          if (!open) settle(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            <AlertDialogDescription>{options?.text}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>{options?.dismissLabel ?? 'Avbryt'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(options?.variant === 'error' && buttonVariants({ variant: 'destructive' }))}
            >
              {options?.confirmLabel ?? 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};
