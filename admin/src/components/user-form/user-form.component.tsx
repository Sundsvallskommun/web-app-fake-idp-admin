import { AdminGroup } from '@data-contracts/backend/data-contracts';
import { Button, Checkbox, FormControl, FormLabel, Icon, Input, SearchField, Spinner } from '@sk-web-gui/react';
import { useResource } from '@utils/use-resource';
import { Plus, Trash } from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';
import { Control, Controller, UseFormRegister, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';
import { emptyCustomAttribute, UserForm } from './user-form.model';
import { userAttributeDefinitions, userPropertyDefinitions } from './user-form.schema';

type UserFormFieldsProps = {
  control: Control<UserForm>;
  register: UseFormRegister<UserForm>;
};

export const UserFormFields: React.FC<UserFormFieldsProps> = ({ control, register }) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'customAttributes' });
  const { data: groupData, loaded: groupsLoaded, loading: groupsLoading } = useResource('groups');
  const groups = groupData as AdminGroup[];
  const [groupQuery, setGroupQuery] = useState('');
  const normalizedGroupQuery = groupQuery.trim().toLowerCase();
  const visibleGroups = groups.filter(
    (group) =>
      !normalizedGroupQuery ||
      group.name.toLowerCase().includes(normalizedGroupQuery) ||
      group.description.toLowerCase().includes(normalizedGroupQuery)
  );

  return (
    <>
      <section className="flex flex-col gap-16">
        <h2 className="text-h4-md font-header mb-0">{capitalize(t('users:sections.account'))}</h2>
        {userPropertyDefinitions.map((definition) => (
          <FormControl key={definition.key} required={definition.required}>
            <FormLabel>{capitalize(t(definition.labelKey))}</FormLabel>
            <Input type={definition.inputType} {...register(definition.key, { required: definition.required })} />
          </FormControl>
        ))}
      </section>

      <section className="flex flex-col gap-16">
        <header>
          <h2 className="text-h4-md font-header mb-0">{capitalize(t('users:sections.groups'))}</h2>
          <p className="text-small text-dark-secondary mt-4">{t('users:groups_help')}</p>
        </header>

        {groupsLoading && <Spinner size={2} />}
        {groupsLoaded && groups.length === 0 && (
          <p className="text-dark-secondary">
            {t('users:no_groups')}{' '}
            <NextLink href="/groups/new" className="underline">
              {t('users:create_group')}
            </NextLink>
          </p>
        )}
        {groups.length > 0 && (
          <>
            <SearchField
              value={groupQuery}
              onChange={(event) => setGroupQuery(event.target.value)}
              onReset={() => setGroupQuery('')}
              showSearchButton={false}
              placeholder={capitalize(t('users:filter_groups'))}
              className="max-w-[32rem]"
            />
            {visibleGroups.length === 0 && <p className="text-dark-disabled">{t('users:no_matching_groups')}</p>}
            <Controller
              control={control}
              name="groupIds"
              render={({ field }) => (
                <Checkbox.Group
                  name={field.name}
                  value={field.value.map(String)}
                  onChange={(values) => field.onChange(values.map(Number))}
                  className="grid gap-12 md:grid-cols-2 max-h-[32rem] overflow-y-auto"
                >
                  {visibleGroups.map((group) => (
                    <Checkbox key={group.id} value={String(group.id)}>
                      <span className="flex flex-col">
                        <strong>{group.name}</strong>
                        {group.description && (
                          <span className="text-small text-dark-secondary">{group.description}</span>
                        )}
                      </span>
                    </Checkbox>
                  ))}
                </Checkbox.Group>
              )}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-16">
        <header>
          <h2 className="text-h4-md font-header mb-0">{capitalize(t('users:sections.known_attributes'))}</h2>
          <p className="text-small text-dark-secondary mt-4">{t('users:known_attributes_help')}</p>
        </header>

        <div className="grid gap-16 md:grid-cols-2">
          {userAttributeDefinitions.map((definition, index) => (
            <FormControl key={definition.key}>
              <FormLabel>
                {capitalize(t(definition.labelKey))}
                <span className="block text-small font-normal text-dark-secondary">{definition.key}</span>
              </FormLabel>
              <Input {...register(`knownAttributes.${index}.value`)} />
            </FormControl>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-16">
        <header className="flex gap-24 items-center flex-wrap">
          <div>
            <h2 className="text-h4-md font-header mb-0">{capitalize(t('users:sections.custom_attributes'))}</h2>
            <p className="text-small text-dark-secondary mt-4">{t('users:custom_attributes_help')}</p>
          </div>
          <Button
            type="button"
            size="sm"
            color="success"
            leftIcon={<Plus />}
            onClick={() => append(emptyCustomAttribute())}
          >
            {capitalize(t('users:add_attribute'))}
          </Button>
        </header>

        {fields.length === 0 && <p className="text-dark-disabled">{t('users:no_custom_attributes')}</p>}

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-12 items-end flex-wrap">
            <FormControl className="grow">
              <FormLabel>{capitalize(t('users:attribute.key'))}</FormLabel>
              <Input {...register(`customAttributes.${index}.key`)} />
            </FormControl>
            <FormControl className="grow">
              <FormLabel>{capitalize(t('users:attribute.value'))}</FormLabel>
              <Input {...register(`customAttributes.${index}.value`)} />
            </FormControl>
            <FormControl className="grow">
              <FormLabel>{capitalize(t('users:attribute.type'))}</FormLabel>
              <Input {...register(`customAttributes.${index}.type`)} />
            </FormControl>
            <FormControl className="grow">
              <FormLabel>{capitalize(t('users:attribute.format'))}</FormLabel>
              <Input {...register(`customAttributes.${index}.format`)} />
            </FormControl>
            <Button
              type="button"
              size="sm"
              rounded
              color="error"
              iconButton
              aria-label={capitalize(t('users:remove_attribute'))}
              onClick={() => remove(index)}
            >
              <Icon icon={<Trash />} />
            </Button>
          </div>
        ))}
      </section>
    </>
  );
};
