import resources from '@config/resources';
import { Resource } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import { Button, cx, FormControl, FormErrorMessage, FormLabel, Input } from '@sk-web-gui/react';
import { fieldpathWithoutIndex } from '@utils/fieldpath-without-index';
import { Minus, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { FieldError, FieldErrorsImpl, FieldValues, Merge, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { EditResourceObject } from './edit-resource-object.component';

interface EditResourceArrayProps {
  property: string;
  resource: ResourceName;
  parents?: string;
  level?: number;
}

export const EditResourceArray: React.FC<EditResourceArrayProps> = ({
  property,
  resource,
  parents,
  level: _level = 2,
}) => {
  const { defaultValues, requiredFields } = resources[resource];
  const level = _level > 6 ? 6 : _level;

  const { t } = useTranslation();

  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const dataTypeKey = parents ? `${parents}.${property}` : property;
  const i18nKey = fieldpathWithoutIndex(dataTypeKey) as string;

  const {
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<DataType>();

  const formdata = watch(dataTypeKey as keyof DataType) as DataType;

  const addEntry = () => {
    if (Array.isArray(formdata)) {
      const newEntry = dataTypeKey.split('.').reduce((entries: DataType, part) => {
        const numberTest = new RegExp(/^\d+$/);
        const property = numberTest.test(part) ? 0 : part;
        return entries?.[property] || defaultValues?.[property as keyof typeof defaultValues];
      }, {} as DataType);
      const entries = [...formdata, ...(Array.isArray(newEntry) ? newEntry : [newEntry])];
      setValue(dataTypeKey as keyof DataType, entries as typeof formdata);
    }
  };

  const removeEntry = (index: number) => {
    if (Array.isArray(formdata)) {
      const entries = [...formdata];
      entries.splice(index, 1);
      setValue(dataTypeKey as keyof DataType, entries as typeof formdata);
    }
  };

  useEffect(() => {
    if (requiredFields && fieldpathWithoutIndex(requiredFields)?.includes(i18nKey)) {
      if (Array.isArray(formdata) && formdata.length > 0) {
        clearErrors(dataTypeKey as keyof DataType);
      } else {
        setError(dataTypeKey as keyof DataType, {
          message: t('common:required', { resource: capitalize(t(`${resource}:properties.${i18nKey}.DEFAULT_many`)) }),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formdata]);

  const error = dataTypeKey
    .split('.')
    .reduce<FieldError | Merge<FieldError, FieldErrorsImpl<DataType>> | undefined>((errorpart, key) => {
      if (errorpart && typeof errorpart === 'object' && !Array.isArray(errorpart) && key in errorpart) {
        return (errorpart as Record<string, unknown>)[key] as
          | FieldError
          | Merge<FieldError, FieldErrorsImpl<DataType>>
          | undefined;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return errors?.[key] as FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
    }, undefined);

  const Headercomp: React.ElementType = `h${level}` as React.ElementType;

  return (
    <div className="flex flex-col gap-16">
      <header className="flex gap-24">
        <Headercomp className={cx('font-header', level < 3 ? 'text-h3-lg' : 'text-h4-md')}>
          {capitalize(t(`${resource}:properties.${i18nKey}.DEFAULT_many`))}
        </Headercomp>
        <Button size="sm" color="success" leftIcon={<Plus />} onClick={() => addEntry()}>
          {capitalize(t('common:add'))} {t(`${resource}:properties.${i18nKey}.DEFAULT`)}
        </Button>
      </header>
      {error?.message && (
        <FormErrorMessage className="font-bold text-error-text-primary">{`${error.message}`}</FormErrorMessage>
      )}
      {Array.isArray(formdata) &&
        formdata.map((item, index) => {
          const type = typeof item;
          const isRequired = requiredFields ? fieldpathWithoutIndex(requiredFields)?.includes(i18nKey) : false;
          if (type === 'string' || type === 'number') {
            return (
              <div key={`res-array-${index}`} className="flex justify-between items-start">
                <FormControl key={`formc-${index}`} required={isRequired}>
                  <FormLabel>{capitalize(t(`${resource}:properties.${i18nKey}`))}</FormLabel>
                  <Input
                    type={type === 'number' ? 'number' : 'text'}
                    {...register(`${dataTypeKey}.${index}` as keyof DataType)}
                  />
                </FormControl>
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
                  onClick={() => removeEntry(index)}
                >
                  <Minus />
                </Button>
              </div>
            );
          }
          if (type === 'object') {
            return Array.isArray(item) ?
                <EditResourceArray
                  key={`res-array-${index}`}
                  resource={resource}
                  parents={parents ? `${parents}.${property}` : property}
                  level={level + 1}
                  property={index.toString()}
                />
              : <EditResourceObject
                  key={`res-array-${index}`}
                  resource={resource}
                  parents={parents ? `${parents}.${property}` : property}
                  level={level + 1}
                  property={index.toString()}
                  index={index}
                  removable
                  onRemove={() => removeEntry(index)}
                />;
          }
        })}
    </div>
  );
};
