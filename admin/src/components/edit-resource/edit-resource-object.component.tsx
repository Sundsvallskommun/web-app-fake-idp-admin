import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { Resource } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { cn } from '@utils/cn';
import { fieldpathWithoutIndex } from '@utils/fieldpath-without-index';
import { Minus } from 'lucide-react';
import { FieldValues, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { EditResourceArray } from './edit-resource-array.component';

interface EditResourceObjectProps {
  property: string;
  resource: ResourceName;
  parents?: string;
  level?: number;
  index?: number;
  removable?: boolean;
  onRemove?: () => void;
}

export const EditResourceObject: React.FC<EditResourceObjectProps> = ({
  property,
  resource,
  parents,
  level: _level = 2,
  index = 0,
  removable,
  onRemove,
}) => {
  const { requiredFields } = resources[resource] || {};
  const level = _level > 6 ? 6 : _level;

  const { t } = useTranslation();

  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const dataTypeKey = parents ? `${parents}.${property}` : property;
  const i18nKey = fieldpathWithoutIndex(dataTypeKey);

  const { register, watch } = useFormContext<DataType>();
  const formdata = watch(dataTypeKey as keyof DataType) as DataType;

  const Headercomp: React.ElementType = `h${level}` as React.ElementType;

  return (
    <div
      className={cn(
        // sk → Tailwind: gap-32/p-32 = 32px → gap-8/p-8; rounded-groups = 16px → rounded-2xl.
        'flex flex-col gap-8 p-8 rounded-2xl',
        level % 2 === 0 ? 'bg-muted shadow-sm' : 'bg-card border border-border'
      )}
    >
      <header className="flex justify-between items-start">
        <Headercomp className={cn('font-semibold', level < 3 ? 'text-2xl font-bold' : 'text-xl font-bold')}>
          {capitalize(t(`${resource}:properties.${i18nKey}.DEFAULT`))} {index !== undefined && index + 1}
        </Headercomp>
        {removable && (
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="rounded-full shrink-0"
            aria-label={capitalize(
              t('common:remove_resource', {
                resource: t(`${resource}:properties.${i18nKey}.DEFAULT`),
              })
            )}
            onClick={() => onRemove && onRemove()}
          >
            <Minus className="size-4" />
          </Button>
        )}
      </header>
      {formdata &&
        Object.keys(formdata)
          .filter((key) => !defaultInformationFields.includes(key))
          .map((key, index) => {
            const type = typeof formdata[key as keyof DataType];
            const isRequired =
              requiredFields ? fieldpathWithoutIndex(requiredFields)?.includes(`${i18nKey}.${key}`) : false;
            if (type === 'string' || type === 'number') {
              return (
                <div key={`res-object-${index}`} className="flex flex-col gap-2">
                  <Label htmlFor={`${dataTypeKey}.${key}`}>
                    {capitalize(t(`${resource}:properties.${i18nKey}.${key}`))}
                    {isRequired && <span aria-hidden="true"> *</span>}
                  </Label>
                  <Input
                    id={`${dataTypeKey}.${key}`}
                    type={type === 'number' ? 'number' : 'text'}
                    required={isRequired}
                    {...register(`${dataTypeKey}.${key}` as keyof DataType)}
                  />
                </div>
              );
            }
            if (type === 'object') {
              return Array.isArray(formdata[key as keyof DataType]) ?
                  <EditResourceArray
                    key={`res-object-${index}`}
                    resource={resource}
                    parents={dataTypeKey}
                    level={level + 1}
                    property={key}
                  />
                : <EditResourceObject
                    key={`res-object-${index}`}
                    resource={resource}
                    parents={dataTypeKey}
                    level={level + 1}
                    property={key}
                  />;
            }
          })}
    </div>
  );
};
