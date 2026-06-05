import { EditResource } from '@components/edit-resource/edit-resource.component';
import { EditorToolbar } from '@components/editor-toolbar/editor-toolbar';
import LoaderFullScreen from '@components/loader/loader-fullscreen';
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
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FieldValues, FormProvider, useForm } from 'react-hook-form';
import { capitalize } from 'underscore.string';

export const EditAssistant: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const { resource: _resource, id: _id } = useParams();
  const resource = stringToResourceName((typeof _resource === 'object' ? _resource[0] : _resource) ?? '');
  if (!resource) {
    router.push('/');
  }

  const { create, update, getOne, defaultValues } = resources[resource as ResourceName];
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
  const [isNew, setIsNew] = useState<boolean>(!id);
  const [navigate, setNavigate] = useState<boolean>(false);

  const formdata = getFormattedFields(watch());

  useRouteGuard(isDirty);

  useEffect(() => {
    setNavigate(false);
    if (id) {
      setIsNew(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      handleGetOne(() => getOne(id)).then((res) => {
        reset(res);
        setIsNew(false);
        setLoaded(true);
      });
    } else {
      reset(defaultValues);
      setIsNew(true);
      setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (navigate) {
      router.push(`/${resource}/${formdata?.id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    if (formdata.id && isNew && !isDirty) {
      setNavigate(true);
    }
  }, [formdata?.id, isNew, isDirty]);

  const onSubmit = (data: DataType) => {
    const createFunc: (data: DataType) => ReturnType<NonNullable<Resource<FieldValues>['create']>> =
      create as NonNullable<Resource<FieldValues>['create']>;
    switch (isNew) {
      case true:
        handleCreate(() => createFunc(data as CreateType)).then((res) => {
          if (res) {
            reset(res);
            refresh();
          }
        });

        break;
      case false:
        if (id) {
          handleUpdate(() => update?.(id, data) as ResourceResponse<Partial<FieldValues>>).then((res) => {
            reset(res);
            refresh();
          });
        }
        break;
    }
  };

  return !loaded || !resource ?
      <LoaderFullScreen />
    : <EditLayout
        headerInfo={
          !isNew ?
            <ul className="text-small flex gap-16">
              {defaultInformationFields.map((field, index) => (
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
          <form className="flex flex-row gap-32 justify-between grow flex-wrap" onSubmit={handleSubmit(onSubmit)}>
            <EditorToolbar resource={resource} isDirty={isDirty} id={id} />
            <EditResource resource={resource} isNew={isNew} />
          </form>
        </FormProvider>
      </EditLayout>;
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale, ['common', 'crud', 'layout', ...Object.keys(resources)])),
  },
});

export default EditAssistant;
