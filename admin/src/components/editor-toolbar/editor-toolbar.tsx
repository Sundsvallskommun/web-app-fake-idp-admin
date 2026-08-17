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
            handleRemove(remove(id)).then((res) => {
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
    <div className="absolute top-10 right-12 w-fit flex items-center gap-1">
      <Button type="submit" size="icon" variant="ghost" disabled={!isDirty} aria-label={capitalize(t('common:save'))}>
        <Save className="size-4" />
      </Button>

      {((!!remove && id) || !id) && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={capitalize(t('common:remove', { resource: t(`${resource}:name_one`) }))}
          onClick={() => onRemove()}
        >
          <Trash className="size-4" />
        </Button>
      )}
    </div>
  );
};
