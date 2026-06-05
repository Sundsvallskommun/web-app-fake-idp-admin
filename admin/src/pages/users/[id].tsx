import LoaderFullScreen from '@components/loader/loader-fullscreen';
import resources from '@config/resources';
import { AdminUser, CreateUserDto } from '@data-contracts/backend/data-contracts';
import EditLayout from '@layouts/edit-layout/edit-layout.component';
import { apiClient } from '@services/api-client';
import { useCrudHelper } from '@utils/use-crud-helpers';
import { useResource } from '@utils/use-resource';
import { useRouteGuard } from '@utils/routeguard.hook';
import { Button, FormControl, FormLabel, Icon, Input, useSnackbar } from '@sk-web-gui/react';
import { Plus, Save, Trash } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { capitalize } from 'underscore.string';

// Default SAML attribute metadata, used when adding a new attribute row.
const SAML_FORMAT = 'urn:oasis:names:tc:SAML:2.0:attrname-format:basic';
const XS_STRING = 'xs:string';

type AttributeForm = { key: string; format: string; value: string; type: string };
type UserForm = { name: string; username: string; password: string; attributes: AttributeForm[] };

const emptyAttribute = (): AttributeForm => ({ key: '', format: SAML_FORMAT, value: '', type: XS_STRING });

const toForm = (user: AdminUser): UserForm => ({
  name: user.name,
  username: user.username,
  password: user.password,
  attributes: user.attributes.map(({ key, format, value, type }) => ({ key, format, value, type })),
});

const toPayload = (data: UserForm): CreateUserDto => ({
  name: data.name,
  username: data.username,
  password: data.password,
  attributes: data.attributes,
});

export const UserEditPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const message = useSnackbar();

  const { id: _id } = useParams();
  const id = typeof _id === 'object' ? _id[0] : _id;
  const isNew = id === 'new';

  const { refresh } = useResource('users');
  const { handleGetOne, handleCreate, handleUpdate } = useCrudHelper('users');

  const form = useForm<UserForm>({
    defaultValues: { name: '', username: '', password: '', attributes: [] },
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'attributes' });

  const [loaded, setLoaded] = useState<boolean>(isNew);

  useRouteGuard(isDirty);

  useEffect(() => {
    if (isNew || !id) {
      setLoaded(true);
      return;
    }
    handleGetOne<AdminUser>(() => apiClient.userControllerGetUser(id)).then((res) => {
      if (res) {
        reset(toForm(res));
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = (data: UserForm) => {
    if (isNew) {
      handleCreate<AdminUser>(() => apiClient.userControllerCreateUser(toPayload(data))).then((res) => {
        if (res) {
          refresh();
          router.push(`/users/${res.id}`);
        }
      });
    } else if (id) {
      handleUpdate<AdminUser>(() => apiClient.userControllerUpdateUser(id, toPayload(data))).then((res) => {
        if (res) {
          reset(toForm(res));
          refresh();
        }
      });
    }
  };

  const onRemove = () => {
    if (isNew || !id) {
      router.push('/users');
      return;
    }
    apiClient
      .userControllerRemoveUser(id)
      .then(() => {
        message({
          message: capitalize(t('crud:remove.success', { resource: t('users:name_one') })),
          status: 'success',
        });
        refresh();
        router.push('/users');
      })
      .catch(() => {
        message({
          message: capitalize(t('crud:remove.error', { resource: t('users:name_one') })),
          status: 'error',
        });
      });
  };

  if (!loaded) {
    return <LoaderFullScreen />;
  }

  return (
    <EditLayout
      title={
        isNew ?
          capitalize(t('common:create_new', { resource: t('users:name_one') }))
        : capitalize(t('common:edit', { resource: t('users:name_one') }))
      }
      backLink="/users"
    >
      <form className="flex flex-col gap-32 grow max-w-4xl" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-16">
          <FormControl required>
            <FormLabel>{capitalize(t('users:properties.name'))}</FormLabel>
            <Input {...register('name')} />
          </FormControl>
          <FormControl required>
            <FormLabel>{capitalize(t('users:properties.username'))}</FormLabel>
            <Input {...register('username')} />
          </FormControl>
          <FormControl required>
            <FormLabel>{capitalize(t('users:properties.password'))}</FormLabel>
            <Input {...register('password')} />
          </FormControl>
        </div>

        <div className="flex flex-col gap-16">
          <header className="flex gap-24 items-center">
            <h2 className="text-h4-md font-header mb-0">{capitalize(t('users:properties.attributes'))}</h2>
            <Button type="button" size="sm" color="success" leftIcon={<Plus />} onClick={() => append(emptyAttribute())}>
              {capitalize(t('users:add_attribute'))}
            </Button>
          </header>

          {fields.length === 0 && <p className="text-dark-disabled">{t('users:no_attributes')}</p>}

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-12 items-end flex-wrap">
              <FormControl className="grow">
                <FormLabel>{capitalize(t('users:attribute.key'))}</FormLabel>
                <Input {...register(`attributes.${index}.key`)} />
              </FormControl>
              <FormControl className="grow">
                <FormLabel>{capitalize(t('users:attribute.value'))}</FormLabel>
                <Input {...register(`attributes.${index}.value`)} />
              </FormControl>
              <FormControl className="grow">
                <FormLabel>{capitalize(t('users:attribute.type'))}</FormLabel>
                <Input {...register(`attributes.${index}.type`)} />
              </FormControl>
              <FormControl className="grow">
                <FormLabel>{capitalize(t('users:attribute.format'))}</FormLabel>
                <Input {...register(`attributes.${index}.format`)} />
              </FormControl>
              <Button
                type="button"
                size="sm"
                rounded
                color="error"
                iconButton
                aria-label={capitalize(t('users:remove_attribute'))}
                onClick={() => remove(index)}
              >
                <Icon icon={<Trash />} />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-16">
          <Button type="submit" color="vattjom" leftIcon={<Save />} disabled={!isDirty}>
            {capitalize(t('common:save'))}
          </Button>
          {!isNew && (
            <Button type="button" variant="secondary" color="error" leftIcon={<Trash />} onClick={onRemove}>
              {capitalize(t('common:remove'))}
            </Button>
          )}
        </div>
      </form>
    </EditLayout>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale as string, ['common', 'crud', 'layout', ...Object.keys(resources)])),
  },
});

export default UserEditPage;
