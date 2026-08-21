import { Button } from '@components/ui/button';
import { RefreshCcw, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';

interface ResourceErrorProps {
  /** Pluralnamn på det som inte kunde hämtas, t.ex. t('users:name_many'). */
  resources: string;
  onRetry: () => void;
}

/**
 * Feltyta för misslyckad hämtning. Toasten försvinner efter några sekunder —
 * utan den här ytan är ett hämtningsfel omöjligt att skilja från en tom lista.
 */
export const ResourceError: React.FC<ResourceErrorProps> = ({ resources, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/50 bg-destructive/5 p-4">
      <p className="flex items-center gap-2 font-medium">
        <TriangleAlert className="size-4 text-destructive" aria-hidden="true" />
        {capitalize(t('common:fetch_failed', { resources }))}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCcw className="size-4" />
        {capitalize(t('common:retry'))}
      </Button>
    </div>
  );
};
