import { useCallback, useEffect, useRef, useState } from 'react';
import router from 'next/router';
import { useConfirm } from '@components/confirm/confirm-context';
import { useTranslation } from 'react-i18next';

export function useRouteGuard(
  showWarning: boolean,
  options?: {
    warningTitle?: string;
    warningText?: string;
    confirmLabel?: string;
    dismissLabel?: string;
  }
): {
  confirm: (options?: {
    warningTitle: string;
    warningText: string;
    confirmLabel?: string;
    dismissLabel?: string;
  }) => Promise<boolean>;
  allowNavigation: () => void;
} {
  const { t } = useTranslation();
  const [active, setActive] = useState<boolean>(false);
  const activeRef = useRef(false);
  const title = options?.warningTitle || t('common:unsaved_changes');
  const text = options?.warningText || t('common:do_you_want_to_leave');
  const confirmLabel = options?.confirmLabel || undefined;
  const dismissLabel = options?.dismissLabel || undefined;
  const { showConfirmation } = useConfirm();

  const setGuardActive = useCallback((value: boolean) => {
    activeRef.current = value;
    setActive(value);
  }, []);

  const allowNavigation = useCallback(() => setGuardActive(false), [setGuardActive]);

  useEffect(() => setGuardActive(showWarning), [setGuardActive, showWarning]);

  useEffect(() => {
    const confirmRouterChange = async (url: string) => {
      const confirm = await showConfirmation(title, text, confirmLabel, dismissLabel, 'info');
      if (confirm) {
        setGuardActive(false);
        router.push(url);
      }
    };

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      if (!activeRef.current) return;
      e.preventDefault();
      return (e.returnValue = `${title} ${text}`);
    };

    const handleBrowseAway = (url: string) => {
      if (!activeRef.current) return;
      confirmRouterChange(url);
      router.events.emit('routeChangeError');
      throw 'routing cancelled. Confirm to continue.';
    };

    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);
    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [active, confirmLabel, dismissLabel, setGuardActive, showConfirmation, text, title]);

  async function confirmer(
    options: {
      warningTitle: string;
      warningText: string;
      confirmLabel?: string;
      dismissLabel?: string;
    } = {
      warningTitle: title,
      warningText: text,
      confirmLabel: confirmLabel,
      dismissLabel: dismissLabel,
    }
  ) {
    if (!activeRef.current) return true;
    const confirm = await showConfirmation(
      options.warningTitle,
      options.warningText,
      options.confirmLabel,
      options.dismissLabel
    );

    return confirm;
  }

  return { confirm: confirmer, allowNavigation };
}
