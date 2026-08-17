import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { Fragment } from 'react';
import { FieldValues, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { EditResourceArray } from './edit-resource-array.component';
import { EditResourceInput } from './edit-resource-input.component';
import { EditResourceObject } from './edit-resource-object.component';
import { ResourceName } from '@interfaces/resource-name';
import { Resource } from '@interfaces/resource';

interface EditResourceProps {
  resource: ResourceName;
  isNew?: boolean;
}

export const EditResource: React.FC<EditResourceProps> = ({ resource }) => {
  const { t } = useTranslation();
  const { requiredFields } = resources[resource];

  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const { watch } = useFormContext<DataType>();
  const formdata = watch() as DataType;

  return (
    <>
      <div className="flex flex-col gap-8 grow mb-8">
        {Object.keys(formdata)
          .filter((key) => !defaultInformationFields.includes(key))
          .map((key, index) => {
            const isRequired = requiredFields ? requiredFields.includes(key as (typeof requiredFields)[number]) : false;

            return (
              <Fragment key={`formc-${index}`}>
                <EditResourceInput
                  property={key}
                  index={index}
                  required={isRequired}
                  label={capitalize(t(`${resource}:properties.${key}`))}
                />
              </Fragment>
            );
          })}
      </div>
      <div className="flex flex-col gap-8 grow mb-8">
        {Object.keys(formdata)
          .filter((key) => !defaultInformationFields.includes(key))
          .map((key, index) => {
            const type = typeof formdata[key];
            if (type === 'object') {
              return Array.isArray(formdata[key]) ?
                  <EditResourceArray key={`res-${index}`} resource={resource} property={key} />
                : <EditResourceObject key={`res-${index}`} resource={resource} property={key} />;
            }
          })}
      </div>
    </>
  );
};
