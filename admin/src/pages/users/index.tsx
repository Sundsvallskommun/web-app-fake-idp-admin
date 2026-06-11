import { ListResources } from '@components/list-resources/list-resources';
import { ListToolbar } from '@components/list-toolbar/list-toolbar';
import { features } from '@config/features';
import resources from '@config/resources';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { ApiResponse, apiService } from '@services/api-service';
import { Button, Icon, Spinner, useSnackbar } from '@sk-web-gui/react';
import { useResource } from '@utils/use-resource';
import { Upload } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo, useRef, useState } from 'react';
import { capitalize } from 'underscore.string';

export const UsersListPage: React.FC = () => {
  const { t } = useTranslation();
  const message = useSnackbar();
  const { data, refresh, loaded, loading } = useResource('users');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Upload a users.js file and replace the whole user store with its contents.
  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again re-fires onChange.
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const res = await apiService.post<ApiResponse<{ imported: number }>>('/users/import', { content });
      message({
        message: t('users:import.success', { count: res?.data?.data?.imported ?? 0 }),
        status: 'success',
      });
      refresh();
    } catch {
      message({ message: t('users:import.error'), status: 'error' });
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
          <span className="flex flex-row items-center gap-16">
            <h1 className="leading-h4-sm">{capitalize(t('users:name_many'))}</h1>
            {(loading || importing) && <Spinner size={2.5} className="leading-h4-sm" />}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              leftIcon={<Icon icon={<Upload />} />}
            >
              {capitalize(t('users:import.button'))}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".js,.json,application/javascript,text/javascript"
              className="hidden"
              onChange={onImportFile}
            />
          </span>
          <ListToolbar resource="users" onRefresh={refresh} properties={getProperties()} />
        </Header>
        {loaded && <ListResources resource="users" data={displayData} />}
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
