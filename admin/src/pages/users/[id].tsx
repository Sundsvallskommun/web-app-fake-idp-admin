import LoaderFullScreen from '@components/loader/loader-fullscreen';
import resources from '@config/resources';
import { AdminUser, CreateUserDto } from '@data-contracts/backend/data-contracts';
import EditLayout from '@layouts/edit-layout/edit-layout.component';
import { apiClient } from '@services/api-client';
import { useCrudHelper } from '@utils/use-crud-helpers';
import { useResource } from '@utils/use-resource';
import { useRouteGuard } from '@utils/routeguard.hook';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { toast } from 'sonner';
import { Plus, Save, Trash } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { capitalize } from '@utils/capitalize';

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
        toast.success(capitalize(t('crud:remove.success', { resource: t('users:name_one') })));
        refresh();
        router.push('/users');
      })
      .catch(() => {
        toast.error(capitalize(t('crud:remove.error', { resource: t('users:name_one') })));
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
      <form className="flex flex-col gap-8 grow max-w-xl" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-name">{capitalize(t('users:properties.name'))}</Label>
            <Input id="user-name" required {...register('name')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-username">{capitalize(t('users:properties.username'))}</Label>
            <Input id="user-username" required {...register('username')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-password">{capitalize(t('users:properties.password'))}</Label>
            <Input id="user-password" required {...register('password')} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <header className="flex gap-6 items-center">
            <h2 className="text-xl font-bold mb-0">{capitalize(t('users:properties.attributes'))}</h2>
            <Button type="button" size="sm" onClick={() => append(emptyAttribute())}>
              <Plus className="size-4" />
              {capitalize(t('users:add_attribute'))}
            </Button>
          </header>

          {fields.length === 0 && <p className="text-muted-foreground">{t('users:no_attributes')}</p>}

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-end flex-wrap">
              <div className="flex flex-col gap-2 grow">
                <Label htmlFor={`attributes.${index}.key`}>{capitalize(t('users:attribute.key'))}</Label>
                <Input id={`attributes.${index}.key`} {...register(`attributes.${index}.key`)} />
              </div>
              <div className="flex flex-col gap-2 grow">
                <Label htmlFor={`attributes.${index}.value`}>{capitalize(t('users:attribute.value'))}</Label>
                <Input id={`attributes.${index}.value`} {...register(`attributes.${index}.value`)} />
              </div>
              <div className="flex flex-col gap-2 grow">
                <Label htmlFor={`attributes.${index}.type`}>{capitalize(t('users:attribute.type'))}</Label>
                <Input id={`attributes.${index}.type`} {...register(`attributes.${index}.type`)} />
              </div>
              <div className="flex flex-col gap-2 grow">
                <Label htmlFor={`attributes.${index}.format`}>{capitalize(t('users:attribute.format'))}</Label>
                <Input id={`attributes.${index}.format`} {...register(`attributes.${index}.format`)} />
              </div>
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="rounded-full shrink-0"
                aria-label={capitalize(t('users:remove_attribute'))}
                onClick={() => remove(index)}
              >
                <Trash className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={!isDirty}>
            <Save className="size-4" />
            {capitalize(t('common:save'))}
          </Button>
          {!isNew && (
            <Button type="button" variant="destructive" onClick={onRemove}>
              <Trash className="size-4" />
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
