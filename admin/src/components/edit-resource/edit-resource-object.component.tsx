import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { Resource } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import { Button, cx, FormControl, FormLabel, Input } from '@sk-web-gui/react';
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
      className={cx(
        'flex flex-col gap-32 p-32 rounded-groups',
        level % 2 === 0 ? 'bg-background-color-mixin-1 shadow-50' : 'bg-background-content border-1 border-divider'
      )}
    >
      <header className="flex justify-between items-start">
        <Headercomp className={cx('font-header', level < 3 ? 'text-h3-lg' : 'text-h4-md')}>
          {capitalize(t(`${resource}:properties.${i18nKey}.DEFAULT`))} {index !== undefined && index + 1}
        </Headercomp>
        {removable && (
          <Button
            size="sm"
            rounded
            color="error"
            iconButton
            aria-label={capitalize(
              t('common:remove_resource', {
                resource: t(`${resource}:properties.${i18nKey}.DEFAULT`),
              })
            )}
            onClick={() => onRemove && onRemove()}
          >
            <Minus />
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
                <FormControl key={`res-object-${index}`} required={isRequired}>
                  <FormLabel>{capitalize(t(`${resource}:properties.${i18nKey}.${key}`))}</FormLabel>
                  <Input
                    type={type === 'number' ? 'number' : 'text'}
                    {...register(`${dataTypeKey}.${key}` as keyof DataType)}
                  />
                </FormControl>
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
