import { Button } from '@components/ui/button';
import { ClaimsPreview as ClaimsPreviewData } from '@data-contracts/backend/data-contracts';
import { apiClient } from '@services/api-client';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ClaimsPreviewProps {
  userId: string;
  hasUnsavedChanges: boolean;
}

/**
 * The OIDC counterpart of AssertionPreview. Deliberately a sibling rather than a
 * tab on it: the two protocols project the same user differently — attribute keys
 * are renamed to standard claims and `groups` becomes an array instead of a
 * comma-separated string — and that difference is the thing an operator comes to
 * this screen to check.
 */
export const ClaimsPreview: React.FC<ClaimsPreviewProps> = ({ userId, hasUnsavedChanges }) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<ClaimsPreviewData>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await apiClient.userControllerGetClaimsPreview(userId);
      setPreview(response.data.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-4 rounded-lg border p-4">
      <header>
        <h2 className="text-xl font-bold mb-0">{t('users:claims_preview.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('users:claims_preview.help')}</p>
      </header>
      {hasUnsavedChanges && <p className="text-sm font-semibold">{t('users:claims_preview.unsaved')}</p>}
      {!preview && !loading && (
        <Button type="button" size="sm" variant="secondary" className="self-start" onClick={() => void load()}>
          {t('users:claims_preview.show')}
        </Button>
      )}
      {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      {failed && (
        <div role="alert" className="flex items-center gap-3 text-destructive">
          <span>{t('users:claims_preview.error')}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            {t('common:retry')}
          </Button>
        </div>
      )}
      {preview && (
        <div className="flex flex-col gap-4">
          <dl>
            <dt className="font-semibold">sub</dt>
            <dd className="font-mono break-all">{preview.sub}</dd>
          </dl>
          {preview.claims.length > 0 ?
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">{t('users:claim.name')}</th>
                    <th className="p-2">{t('users:claim.value')}</th>
                    <th className="p-2">{t('users:claim.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.claims.map((claim, index) => (
                    <tr key={`${claim.name}-${index}`} className="border-b">
                      <td className="p-2 font-mono break-all">{claim.name}</td>
                      <td className="p-2 break-all">{claim.value}</td>
                      <td className="p-2 font-mono break-all">{claim.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : <p className="text-muted-foreground">{t('users:claims_preview.no_claims')}</p>}
          <p className="text-sm text-muted-foreground">{t('users:claims_preview.masked')}</p>
        </div>
      )}
    </section>
  );
};
