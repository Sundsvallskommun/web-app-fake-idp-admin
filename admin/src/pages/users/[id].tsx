import LoaderFullScreen from '@components/loader/loader-fullscreen';
import { AssertionPreview } from '@components/assertion-preview/assertion-preview.component';
import { useConfirm } from '@components/confirm/confirm-context';
import { ResourceError } from '@components/resource-error/resource-error.component';
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
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { capitalize } from '@utils/capitalize';

export const UserEditPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { showConfirmation } = useConfirm();

  const { id: _id } = router.query;
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
    resetField,
    getValues,
    formState: { isDirty, isSubmitting },
  } = form;
  const [loaded, setLoaded] = useState<boolean>(isNew);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formVersion, setFormVersion] = useState(0);

  const { allowNavigation } = useRouteGuard(isDirty);

  const loadUser = useCallback(async () => {
    if (isNew || !id) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    setLoadFailed(false);
    const response = await handleGetOne<AdminUser>(() => apiClient.userControllerGetUser(id));
    if (response) reset(userToForm(response));
    else setLoadFailed(true);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew, reset]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  const revealCitizenIdentifier = useCallback(async () => {
    if (isNew || !id) {
      return '';
    }

    try {
      const response = await apiClient.userControllerGetCitizenIdentifier(id);
      return response.data.data.value;
    } catch (error) {
      toast.error(t('users:reveal_citizen_identifier_error'));
      throw error;
    }
  }, [id, isNew, t]);

  const onSubmit = async (data: UserForm) => {
    if (isNew) {
      const response = await handleCreate<AdminUser>(() => apiClient.userControllerCreateUser(userFormToPayload(data)));
      if (response) {
        // Clear dirty state before navigation so the route guard does not claim
        // the successfully saved form still contains unsaved changes.
        reset(userToForm(response));
        refresh();
        allowNavigation();
        await router.push(`/users/${response.id}`);
      }
    } else if (id) {
      const response = await handleUpdate<AdminUser>(() => apiClient.userControllerUpdateUser(id, userFormToPayload(data)));
      if (response) {
        reset(userToForm(response));
        setFormVersion((version) => version + 1);
        refresh();
      }
    }
  };

  const onRemove = async () => {
    if (isNew || !id) {
      await router.push('/users');
      return;
    }
    const name = getValues('name') || getValues('username');
    const confirmed = await showConfirmation(
      capitalize(t('users:remove.confirm_title', { name })),
      t('users:remove.confirm_text', { name }),
      capitalize(t('common:remove')),
      capitalize(t('common:keep_edit')),
      'error'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await apiClient.userControllerRemoveUser(id);
      toast.success(capitalize(t('crud:remove.success', { resource: t('users:name_one') })));
      refresh();
      allowNavigation();
      await router.push('/users');
    } catch {
      toast.error(capitalize(t('crud:remove.error', { resource: t('users:name_one') })));
      setDeleting(false);
    }
  };

  if (!loaded) {
    return <LoaderFullScreen />;
  }

  if (loadFailed) {
    return (
      <EditLayout title={capitalize(t('users:name_one'))} backLink="/users">
        <ResourceError resources={t('users:name_one')} onRetry={() => void loadUser()} />
      </EditLayout>
    );
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
        <UserFormFields
          key={`${id ?? 'new'}-${formVersion}`}
          control={control}
          register={register}
          resetField={resetField}
          revealCitizenIdentifier={isNew ? undefined : revealCitizenIdentifier}
        />

        {!isNew && id && <AssertionPreview userId={id} hasUnsavedChanges={isDirty} />}

        <div className="flex gap-4">
          <Button type="submit" disabled={!isDirty || isSubmitting || deleting}>
            <Save className="size-4" />
            {capitalize(t('common:save'))}
          </Button>
          {!isNew && (
            <Button type="button" variant="destructive" onClick={() => void onRemove()} disabled={isSubmitting || deleting}>
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
