import { ListResources } from '@components/list-resources/list-resources';
import { ListToolbar } from '@components/list-toolbar/list-toolbar';
import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import DefaultLayout from '@layouts/default-layout/default-layout.component';
import { Header } from '@layouts/header/header.component';
import Main from '@layouts/main/main.component';
import { Loader2 } from 'lucide-react';
import { stringToResourceName } from '@utils/stringToResourceName';
import { useResource } from '@utils/use-resource';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { capitalize } from '@utils/capitalize';

export const Exempelsida: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const { resource: _resource } = useParams();
  const resource = stringToResourceName((typeof _resource === 'object' ? _resource[0] : _resource) ?? '');

  const { data, refresh, loaded, loading } = useResource(resource as ResourceName);

  useEffect(() => {
    if (!resource) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource]);

  const getProperties = () => {
    return data?.[0] ?
        Object.keys(data[0]).filter((key) => {
          const type = typeof data[0][key];
          return type === 'string' || type === 'number' || type === 'boolean';
        })
      : undefined;
  };

  return (
    resource && (
      <DefaultLayout title={`${capitalize(t(`${resource}:name_many`))} - ${process.env.NEXT_PUBLIC_APP_NAME}`}>
        <Main>
          <Header>
            <span className="flex flex-row gap-4 items-center">
              <h1 className="text-3xl font-bold leading-6">{capitalize(t(`${resource}:name_many`))}</h1>
              {loading && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
            </span>
            <ListToolbar resource={resource} onRefresh={refresh} properties={getProperties()} />
          </Header>
          {loaded && <ListResources resource={resource} data={data} />}
        </Main>
      </DefaultLayout>
    )
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'layout', 'crud', ...Object.keys(resources)])),
  },
});

export default Exempelsida;
