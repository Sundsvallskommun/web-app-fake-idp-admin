import { Button } from '@components/ui/button';
import { AssertionPreview as AssertionPreviewData } from '@data-contracts/backend/data-contracts';
import { apiClient } from '@services/api-client';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface AssertionPreviewProps {
  userId: string;
  hasUnsavedChanges: boolean;
}

export const AssertionPreview: React.FC<AssertionPreviewProps> = ({ userId, hasUnsavedChanges }) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<AssertionPreviewData>();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await apiClient.userControllerGetAssertionPreview(userId);
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
        <h2 className="text-xl font-bold mb-0">{t('users:assertion_preview.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('users:assertion_preview.help')}</p>
      </header>
      {hasUnsavedChanges && <p className="text-sm font-semibold">{t('users:assertion_preview.unsaved')}</p>}
      {!preview && !loading && (
        <Button type="button" size="sm" variant="secondary" className="self-start" onClick={() => void load()}>
          {t('users:assertion_preview.show')}
        </Button>
      )}
      {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      {failed && (
        <div role="alert" className="flex items-center gap-3 text-destructive">
          <span>{t('users:assertion_preview.error')}</span>
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            {t('common:retry')}
          </Button>
        </div>
      )}
      {preview && (
        <div className="flex flex-col gap-4">
          <dl>
            <dt className="font-semibold">NameID</dt>
            <dd className="font-mono break-all">{preview.nameId}</dd>
          </dl>
          {preview.attributes.length > 0 ?
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-2">{t('users:attribute.key')}</th>
                    <th className="p-2">{t('users:attribute.value')}</th>
                    <th className="p-2">{t('users:attribute.format')}</th>
                    <th className="p-2">{t('users:attribute.type')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.attributes.map((attribute, index) => (
                    <tr key={`${attribute.key}-${index}`} className="border-b">
                      <td className="p-2 font-mono break-all">{attribute.key}</td>
                      <td className="p-2 break-all">{attribute.value}</td>
                      <td className="p-2 font-mono break-all">{attribute.format}</td>
                      <td className="p-2 font-mono break-all">{attribute.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          : <p className="text-muted-foreground">{t('users:assertion_preview.no_attributes')}</p>}
          <p className="text-sm text-muted-foreground">{t('users:assertion_preview.masked')}</p>
        </div>
      )}
    </section>
  );
};
