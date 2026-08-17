import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { UserFormFields } from '@components/user-form/user-form.component';
import { createEmptyUserForm, UserForm, userFormToPayload, userToForm } from '@components/user-form/user-form.model';
import resources from '@config/resources';
import { AdminUser } from '@data-contracts/backend/data-contracts';
import EditLayout from '@layouts/edit-layout/edit-layout.component';
import { apiClient } from '@services/api-client';
import { useCrudHelper } from '@utils/use-crud-helpers';
import { useResource } from '@utils/use-resource';
import { useRouteGuard } from '@utils/routeguard.hook';
import { Button } from '@components/ui/button';
import { toast } from 'sonner';
import { Save, Trash } from 'lucide-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { capitalize } from '@utils/capitalize';

export const UserEditPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();

  const { id: _id } = useParams();
  const id = typeof _id === 'object' ? _id[0] : _id;
  const isNew = id === 'new';

  const { refresh } = useResource('users');
  const { handleGetOne, handleCreate, handleUpdate } = useCrudHelper('users');

  const form = useForm<UserForm>({
    defaultValues: createEmptyUserForm(),
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = form;
  const [loaded, setLoaded] = useState<boolean>(isNew);

  useRouteGuard(isDirty);

  useEffect(() => {
    if (isNew || !id) {
      setLoaded(true);
      return;
    }
    handleGetOne<AdminUser>(() => apiClient.userControllerGetUser(id)).then((res) => {
      if (res) {
        reset(userToForm(res));
      }
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmit = (data: UserForm) => {
    if (isNew) {
      handleCreate<AdminUser>(() => apiClient.userControllerCreateUser(userFormToPayload(data))).then((res) => {
        if (res) {
          refresh();
          router.push(`/users/${res.id}`);
        }
      });
    } else if (id) {
      handleUpdate<AdminUser>(() => apiClient.userControllerUpdateUser(id, userFormToPayload(data))).then((res) => {
        if (res) {
          reset(userToForm(res));
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
        <UserFormFields control={control} register={register} />

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
