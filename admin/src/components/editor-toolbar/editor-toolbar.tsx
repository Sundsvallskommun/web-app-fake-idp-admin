import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import { Button } from '@components/ui/button';
import { useConfirm } from '@components/confirm/confirm-context';
import { useCrudHelper } from '@utils/use-crud-helpers';
import { Save, Trash } from 'lucide-react';
import { useRouter } from 'next/router';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { useState } from 'react';

interface ToolbarProps {
  resource: ResourceName;
  id?: number;
  isDirty?: boolean;
  allowNavigation?: () => void;
}

export const EditorToolbar: React.FC<ToolbarProps> = ({ resource, isDirty, id, allowNavigation }) => {
  const router = useRouter();
  const parentPath = resource ? `/${resource}` : router.pathname.split('/[')[0].replace('/new', '');
  const { remove } = resources[resource];
  const { handleRemove } = useCrudHelper(resource);
  const confirm = useConfirm();
  const { t } = useTranslation();
  const {
    reset,
    getValues,
    formState: { isSubmitting },
  } = useFormContext();
  const [deleting, setDeleting] = useState(false);

  const onRemove = async () => {
    if (remove && id) {
      const name = String(getValues('name') ?? t(`${resource}:name_one`));
      const confirmed = await confirm.showConfirmation(
        capitalize(t('common:remove_named_resource', { resource: t(`${resource}:name_one`), name })),
        t(`${resource}:remove_confirm`, { name, count: Number(getValues('userCount') ?? 0) }),
        capitalize(t('common:remove')),
        capitalize(t('common:keep_edit')),
        'error'
      );
      if (!confirmed) return;

      setDeleting(true);
      // Thunk: handleRemove owns invocation, error handling and success feedback.
      const removed = await handleRemove(() => remove(id));
      if (removed) {
        reset();
        allowNavigation?.();
        await router.push(parentPath);
      } else {
        setDeleting(false);
      }
    } else if (!id) {
      await router.push(parentPath);
    }
  };

  return (
    // Tydliga textknappar under formulärfälten, samma mönster som
    // users-formulärets spara/ta bort-rad.
    <div className="flex items-center gap-4">
      <Button type="submit" disabled={!isDirty || isSubmitting || deleting}>
        <Save className="size-4" />
        {capitalize(t('common:save'))}
      </Button>

      {((!!remove && id) || !id) && (
        <Button type="button" variant="destructive" onClick={() => void onRemove()} disabled={isSubmitting || deleting}>
          <Trash className="size-4" />
          {capitalize(t('common:remove'))}
        </Button>
      )}
    </div>
  );
};
