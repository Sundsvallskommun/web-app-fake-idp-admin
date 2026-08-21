import { ResourceError } from '@components/resource-error/resource-error.component';
import { PickerItem, ResourcePicker } from '@components/resource-picker/resource-picker.component';
import { ResourceName } from '@interfaces/resource-name';
import { capitalize } from '@utils/capitalize';
import { useResource } from '@utils/use-resource';
import { Loader2 } from 'lucide-react';
import { Controller, FieldValues, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface EditResourceRelationProps {
  resource: ResourceName;
  property: string;
  targetResource: ResourceName;
}

export const EditResourceRelation: React.FC<EditResourceRelationProps> = ({
  resource,
  property,
  targetResource,
}) => {
  const { t } = useTranslation();
  const { control } = useFormContext<FieldValues>();
  const { data, loaded, loading, error, refresh } = useResource(targetResource);
  const items = data as PickerItem[];
  const label = capitalize(t(`${resource}:properties.${property}`));

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="text-xl font-bold mb-0">{label}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t(`${resource}:${property}_help`)}</p>
      </header>

      {loading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
      {error && items.length === 0 && (
        <ResourceError resources={t(`${targetResource}:name_many`)} onRetry={refresh} />
      )}
      {!error && loaded && items.length === 0 && (
        <p className="text-muted-foreground">
          {t('common:no_resources', { resources: t(`${targetResource}:name_many`) })}
        </p>
      )}
      {items.length > 0 && (
        <Controller
          control={control}
          name={property}
          render={({ field }) => (
            <ResourcePicker
              items={items}
              value={Array.isArray(field.value) ? field.value : []}
              onChange={field.onChange}
              idPrefix={`${resource}-${targetResource}`}
              label={label}
              searchLabel={t('common:filter_resources', { resources: t(`${targetResource}:name_many`) })}
              noMatchLabel={t('common:no_matching_resources', { resources: t(`${targetResource}:name_many`) })}
            />
          )}
        />
      )}
    </section>
  );
};
