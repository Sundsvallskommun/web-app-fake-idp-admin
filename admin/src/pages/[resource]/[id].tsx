import { EditResource } from '@components/edit-resource/edit-resource.component';
import { EditorToolbar } from '@components/editor-toolbar/editor-toolbar';
import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { ResourceError } from '@components/resource-error/resource-error.component';
import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { Resource, ResourceResponse } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import EditLayout from '@layouts/edit-layout/edit-layout.component';
import { getFormattedFields } from '@utils/formatted-field';
import { useRouteGuard } from '@utils/routeguard.hook';
import { stringToResourceName } from '@utils/stringToResourceName';
import { useCrudHelper } from '@utils/use-crud-helpers';
import { useResource } from '@utils/use-resource';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { capitalize } from '@utils/capitalize';

export const EditAssistant: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const { resource: _resource, id: _id } = router.query;
  const resource = stringToResourceName((typeof _resource === 'object' ? _resource[0] : _resource) ?? '');
  if (!resource) {
    router.push('/');
  }

  const { create, update, getOne, defaultValues, toForm } = resources[resource as ResourceName] as Resource<FieldValues>;
  const { refresh } = useResource(resource as ResourceName);

  const { handleGetOne, handleCreate, handleUpdate } = useCrudHelper(resource as ResourceName);

  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const form = useForm<DataType>({
    defaultValues: defaultValues,
  });
  const {
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = form;

  const id = _id === 'new' ? undefined : parseInt(_id as string, 10);

  const [loaded, setLoaded] = useState<boolean>(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isNew, setIsNew] = useState<boolean>(!id);
  const [navigate, setNavigate] = useState<boolean>(false);

  const formdata = getFormattedFields(watch());

  const { allowNavigation } = useRouteGuard(isDirty);

  useEffect(() => {
    setNavigate(false);
    if (id) {
      setIsNew(false);
    }
  }, [id]);

  const loadResource = useCallback(async () => {
    setLoaded(false);
    setLoadFailed(false);
    if (id) {
      const res = await handleGetOne(() => getOne(id));
      if (res) {
        reset(res && toForm ? toForm(res) : res);
        setIsNew(false);
      } else {
        setLoadFailed(true);
      }
    } else {
      reset(defaultValues);
      setIsNew(true);
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, resource]);

  useEffect(() => {
    void loadResource();
  }, [loadResource]);

  useEffect(() => {
    if (navigate) {
      allowNavigation();
      router.push(`/${resource}/${formdata?.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (formdata.id && isNew && !isDirty) {
      setNavigate(true);
    }
  }, [formdata?.id, isNew, isDirty]);

  const onSubmit = async (data: DataType) => {
    const createFunc: (data: DataType) => ReturnType<NonNullable<Resource<FieldValues>['create']>> =
      create as NonNullable<Resource<FieldValues>['create']>;
    switch (isNew) {
      case true: {
        const created = await handleCreate(() => createFunc(data as CreateType));
        if (created) {
          reset(toForm ? toForm(created) : created);
          refresh();
        }

        break;
      }
      case false: {
        if (id) {
          const updated = await handleUpdate(() => update?.(id, data) as ResourceResponse<Partial<FieldValues>>);
          if (updated) {
            reset(toForm ? toForm(updated) : updated);
            refresh();
          }
        }
        break;
      }
    }
  };

  if (!loaded || !resource) return <LoaderFullScreen />;

  if (loadFailed) {
    return (
      <EditLayout title={capitalize(t(`${resource}:name_one`))} backLink={`/${resource}`}>
        <ResourceError resources={t(`${resource}:name_one`)} onRetry={() => void loadResource()} />
      </EditLayout>
    );
  }

  return (
    <EditLayout
        headerInfo={
          !isNew ?
            <ul className="text-sm flex flex-wrap gap-x-4 gap-y-1">
              {/* Visa bara fält som resursen faktiskt har med värde — Group saknar
                  t.ex. createdAt/updatedAt och etiketter utan värden är brus. */}
              {defaultInformationFields
                .filter((field) => formdata?.[field] !== undefined && formdata?.[field] !== null && formdata?.[field] !== '')
                .map((field, index) => (
                  <li key={index + field}>
                    <strong>{capitalize(t(`common:${field}`))}: </strong>
                    {formdata?.[field]}
                  </li>
                ))}
            </ul>
          : undefined
        }
        title={
          isNew ?
            capitalize(t('common:create_new', { resource: t(`${resource}:name`, { count: 1 }) }))
          : capitalize(t('common:edit', { resource: t(`${resource}:name_one`) }))
        }
        backLink={`/${resource}`}
      >
        <FormProvider {...form}>
          {/* Vertikal kolumn (som users-formuläret). Den gamla flex-row + wrap +
              justify-between + grow stretchade raderna över hela sidhöjden, så
              verktygsraden hamnade svävande och fälten långt ner. */}
          <form className="flex flex-col gap-8 max-w-xl" onSubmit={handleSubmit(onSubmit)}>
            <EditResource resource={resource} isNew={isNew} />
            <EditorToolbar resource={resource} isDirty={isDirty} id={id} allowNavigation={allowNavigation} />
          </form>
        </FormProvider>
    </EditLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'crud', 'layout', ...Object.keys(resources)])),
  },
});

export default EditAssistant;
