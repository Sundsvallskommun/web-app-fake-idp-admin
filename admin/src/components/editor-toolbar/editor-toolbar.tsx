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

interface ToolbarProps {
  resource: ResourceName;
  id?: number;
  isDirty?: boolean;
}

export const EditorToolbar: React.FC<ToolbarProps> = ({ resource, isDirty, id }) => {
  const router = useRouter();
  const parentPath = resource ? `/${resource}` : router.pathname.split('/[')[0].replace('/new', '');
  const { remove } = resources[resource];
  const { handleRemove } = useCrudHelper(resource);
  const confirm = useConfirm();
  const { reset } = useFormContext();

  const onRemove = () => {
    if (remove && id) {
      confirm
        .showConfirmation(
          capitalize(t('common:remove_resource', { resource: t(`${resource}:name_one`) })),
          capitalize(t('common:can_not_be_undone')),
          capitalize(t('common:remove')),
          capitalize(t('common:keep_edit')),
          'error'
        )
        .then((confirm) => {
          if (confirm) {
            // OBS: thunk — handleRemove anropar själv. `handleRemove(remove(id))`
            // skickade ett redan startat promise; hjälparen kraschade på att
            // "anropa" det, visade fel-toast och navigerade aldrig, trots att
            // servern hann radera. Doldes av att Remove<T = any> returnerade any.
            handleRemove(() => remove(id)).then((res) => {
              if (res) {
                reset();
                router.push(parentPath);
              }
            });
          }
        });
    } else if (!id) {
      router.push(parentPath);
    }
  };

  const { t } = useTranslation();
  return (
    // Tydliga textknappar under formulärfälten, samma mönster som
    // users-formulärets spara/ta bort-rad.
    <div className="flex items-center gap-4">
      <Button type="submit" disabled={!isDirty}>
        <Save className="size-4" />
        {capitalize(t('common:save'))}
      </Button>

      {((!!remove && id) || !id) && (
        <Button type="button" variant="destructive" onClick={() => onRemove()}>
          <Trash className="size-4" />
          {capitalize(t('common:remove'))}
        </Button>
      )}
    </div>
  );
};
