import { ListResources } from '@components/list-resources/list-resources';
import { ListToolbar } from '@components/list-toolbar/list-toolbar';
import { features } from '@config/features';
import resources from '@config/resources';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { Spinner } from '@sk-web-gui/react';
import { useResource } from '@utils/use-resource';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useMemo } from 'react';
import { capitalize } from 'underscore.string';

export const UsersListPage: React.FC = () => {
  const { t } = useTranslation();
  const { data, refresh, loaded, loading } = useResource('users');

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
          <span className="flex flex-row gap-16">
            <h1 className="leading-h4-sm">{capitalize(t('users:name_many'))}</h1>
            {loading && <Spinner size={2.5} className="leading-h4-sm" />}
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
