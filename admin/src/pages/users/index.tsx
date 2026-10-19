import { ListResources } from '@components/list-resources/list-resources';
import { ListToolbar } from '@components/list-toolbar/list-toolbar';
import { ResourceError } from '@components/resource-error/resource-error.component';
import { useConfirm } from '@components/confirm/confirm-context';
import { features } from '@config/features';
import resources from '@config/resources';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { apiClient } from '@services/api-client';
import { isCompleteRecoveryBackup } from '@services/users-transfer';
import { Button } from '@components/ui/button';
import { Download, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useResource } from '@utils/use-resource';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useRef, useState } from 'react';
import { capitalize } from '@utils/capitalize';
import axios from 'axios';

export const UsersListPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, refresh, loaded, loading, error } = useResource('users');
  const { showConfirmation } = useConfirm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Trigger a client-side download of `content` as `filename` (no download util exists yet).
  const downloadFile = (content: string, filename: string) => {
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const backupFilename = (prefix: string) =>
    `${prefix}-${new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}.json`;

  const fetchBackup = async () => {
    const response = await apiClient.instance.get<string>('/api/users/export', { responseType: 'text' });
    return response.data;
  };

  const errorMessage = (error: unknown, fallback: string) => {
    if (!axios.isAxiosError(error)) return fallback;
    const message = error.response?.data?.message;
    return typeof message === 'string' ? message : fallback;
  };

  // Download the whole user store as a re-importable users.js module.
  const onExport = async () => {
    // Filen innehåller klartextlösenord (simulatorns syfte) — gör nedladdningen
    // till ett medvetet val istället för en reflex.
    const confirmed = await showConfirmation(
      capitalize(t('users:export.confirm_title')),
      t('users:export.confirm_text'),
      capitalize(t('users:export.button')),
      capitalize(t('common:close'))
    );
    if (!confirmed) return;
    setExporting(true);
    try {
      downloadFile(await fetchBackup(), backupFilename('fake-idp-backup'));
      toast.success(t('users:export.success'));
    } catch (error) {
      toast.error(errorMessage(error, t('users:export.error')));
    } finally {
      setExporting(false);
    }
  };

  // Upload a users.js file and replace the whole user store with its contents.
  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-fires onChange.
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const previewResponse = await apiClient.userControllerPreviewImportUsers({ content });
      const preview = previewResponse.data.data;
      const warningText = preview.warnings.length > 0 ? ` ${preview.warnings.join(' ')}` : '';
      const format =
        preview.format === 'backup-v2' ? t('users:import.formats.backup_v2') :
        preview.format === 'backup-v1' ? t('users:import.formats.backup_v1') : t('users:import.formats.legacy_users_js');
      const confirmed = await showConfirmation(
        capitalize(t('users:import.confirm_title')),
        `${t('users:import.confirm_text', {
          current: preview.currentUserCount,
          incoming: preview.incomingUserCount,
          preserved: preview.preservedUserIds,
          generated: preview.generatedUserIds,
          removed: preview.removedUserIds,
          groups: preview.groupCount,
          applications: preview.applicationCount,
          format,
          groupCatalog:
            preview.replacesGroupCatalog ? t('users:import.catalog_replaced') : t('users:import.catalog_preserved'),
          applicationCatalog:
            preview.replacesApplicationCatalog ? t('users:import.catalog_replaced') : t('users:import.catalog_preserved'),
        })}${warningText}`,
        capitalize(t('users:import.confirm_button')),
        capitalize(t('common:close')),
        'error'
      );
      if (!confirmed) return;

      // Parse the generated recovery point through the same backend validation
      // path before offering it as the rollback artifact.
      const recoveryContent = await fetchBackup();
      const recoveryPreviewResponse = await apiClient.userControllerPreviewImportUsers({ content: recoveryContent });
      if (!isCompleteRecoveryBackup(recoveryPreviewResponse.data.data)) {
        toast.error(t('users:import.recovery_invalid'));
        return;
      }

      downloadFile(recoveryContent, backupFilename('fake-idp-before-import'));
      const recoveryConfirmed = await showConfirmation(
        capitalize(t('users:import.recovery_title')),
        t('users:import.recovery_text'),
        capitalize(t('users:import.recovery_confirm')),
        capitalize(t('common:close')),
        'error'
      );
      if (!recoveryConfirmed) return;

      const response = await apiClient.userControllerImportUsers({
        content,
        confirmationToken: preview.confirmationToken,
      });
      toast.success(t('users:import.success', { count: response.data.data.imported }));
      refresh();
    } catch (error) {
      toast.error(errorMessage(error, t('users:import.error')));
    } finally {
      setImporting(false);
    }
  };

  // The password is sensitive; strip it from the list data unless the feature
  // flag is on. Every list column (table + column-settings) is derived from the
  // data keys, so omitting the field hides it everywhere at once.
  const displayData = useMemo(
    () =>
      features.showUserPasswords ? data : (
        data.map((row) => {
          const rest = { ...row };
          delete rest.password;
          return rest;
        })
      ),
    [data]
  );

  const getProperties = () =>
    displayData?.[0] ?
      Object.keys(displayData[0]).filter((key) => {
        const type = typeof displayData[0][key];
        return type === 'string' || type === 'number' || type === 'boolean';
      })
    : undefined;

  return (
    <DefaultLayout title={`${capitalize(t('users:name_many'))} - ${process.env.NEXT_PUBLIC_APP_NAME}`}>
      <Main>
        <Header>
          {/* flex-wrap: knappar och verktygsrad radbryts under rubriken på smala
              skärmar istället för att överlappa. */}
          <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-bold leading-6">{capitalize(t('users:name_many'))}</h1>
            {(loading || importing || exporting) && (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            )}
            <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
              <Upload className="size-4" />
              {capitalize(t('users:import.button'))}
            </Button>
            <Button variant="secondary" size="sm" onClick={onExport} disabled={exporting}>
              <Download className="size-4" />
              {capitalize(t('users:export.button'))}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.js,application/json,application/javascript,text/javascript"
              className="hidden"
              onChange={onImportFile}
            />
            <ListToolbar className="ml-auto" resource="users" onRefresh={refresh} properties={getProperties()} />
          </div>
        </Header>
        {error && data.length === 0 ?
          <ResourceError resources={t('users:name_many')} onRetry={refresh} />
        : loaded && <ListResources resource="users" data={displayData} />}
      </Main>
    </DefaultLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale as string, ['common', 'layout', 'crud', ...Object.keys(resources)])),
  },
});

export default UsersListPage;
