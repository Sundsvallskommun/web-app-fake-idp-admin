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
  const { formFields, requiredFields } = resources[resource] as Resource<FieldValues>;

  type CreateType = Parameters<NonNullable<Resource<FieldValues>['create']>>[0];
  type UpdateType = Parameters<NonNullable<Resource<FieldValues>['update']>>[1];
  type DataType = CreateType | UpdateType;

  const { watch } = useFormContext<DataType>();
  const formdata = watch() as DataType;
  const editableFields = formFields ?? Object.keys(formdata);

  return (
    <>
      <div className="flex flex-col gap-32 grow mb-32">
        {editableFields
          .filter((key) => !defaultInformationFields.includes(key))
          .map((key, index) => {
            const isRequired = requiredFields ? requiredFields.some((requiredField) => requiredField === key) : false;

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
      <div className="flex flex-col gap-32 grow mb-32">
        {editableFields
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
