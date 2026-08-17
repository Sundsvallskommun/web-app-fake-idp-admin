import { ResourceCard } from '@components/resource-card/resource-card.component';
import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { capitalize } from '@utils/capitalize';

export const Start = () => {
  const { t } = useTranslation();

  return (
    <DefaultLayout title={`${process.env.NEXT_PUBLIC_APP_NAME} - ${t('example:title')}`}>
      <Main>
        <Header>
          <h1 className="mb-0">{capitalize(`${t('common:welcome')}`)}</h1>
        </Header>
        <ul className="flex flex-wrap gap-32">
          {Object.keys(resources).map((resourceName, index) => (
            <ResourceCard key={`${resourceName}-${index}`} resource={resourceName as ResourceName} />
          ))}
        </ul>
      </Main>
    </DefaultLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'layout', 'crud', ...Object.keys(resources)])),
  },
});

export default Start;
