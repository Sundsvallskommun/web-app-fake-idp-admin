import { AdminGroup } from '@data-contracts/backend/data-contracts';
import { Button } from '@components/ui/button';
import { Checkbox } from '@components/ui/checkbox';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { PasswordInput } from '@components/password-input/password-input';
import { useResource } from '@utils/use-resource';
import { Loader2, Plus, Search, Trash, X } from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';
import { Control, Controller, UseFormRegister, useFieldArray } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
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
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.account'))}</h2>
        {userPropertyDefinitions.map((definition) => (
          <div key={definition.key} className="flex flex-col gap-2">
            <Label htmlFor={`user-${definition.key}`}>
              {capitalize(t(definition.labelKey))}
              {definition.required && <span aria-hidden="true"> *</span>}
            </Label>
            {definition.inputType === 'password' ?
              <PasswordInput
                id={`user-${definition.key}`}
                required={definition.required}
                autoComplete="off"
                {...register(definition.key, { required: definition.required })}
              />
            : <Input
                id={`user-${definition.key}`}
                type={definition.inputType}
                required={definition.required}
                {...register(definition.key, { required: definition.required })}
              />
            }
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.groups'))}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('users:groups_help')}</p>
        </header>

        {groupsLoading && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        {groupsLoaded && groups.length === 0 && (
          <p className="text-muted-foreground">
            {t('users:no_groups')}{' '}
            <NextLink href="/groups/new" className="underline">
              {t('users:create_group')}
            </NextLink>
          </p>
        )}
        {groups.length > 0 && (
          <>
            <div className="relative max-w-80">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={groupQuery}
                onChange={(event) => setGroupQuery(event.target.value)}
                placeholder={capitalize(t('users:filter_groups'))}
                aria-label={capitalize(t('users:filter_groups'))}
                className="pl-9 pr-9"
              />
              {groupQuery && (
                <button
                  type="button"
                  onClick={() => setGroupQuery('')}
                  aria-label={capitalize(t('common:clear', { defaultValue: 'Rensa' }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {visibleGroups.length === 0 && <p className="text-muted-foreground">{t('users:no_matching_groups')}</p>}
            <Controller
              control={control}
              name="groupIds"
              render={({ field }) => {
                // sk:s Checkbox.Group ägde värdelistan; Radix checkbox är enskild,
                // så till/frånslag mot fältets array görs här.
                const toggle = (groupId: number, checked: boolean) =>
                  field.onChange(
                    checked ? [...field.value, groupId] : field.value.filter((id: number) => id !== groupId)
                  );

                return (
                  <div
                    role="group"
                    aria-label={capitalize(t('users:sections.groups'))}
                    className="grid gap-3 md:grid-cols-2 max-h-80 overflow-y-auto"
                  >
                    {visibleGroups.map((group) => (
                      // min-w-0 + break-words: annars trycker långa obrutna
                      // gruppnamn (URL:er, AD-namn) in under grannkolumnen.
                      <div key={group.id} className="flex items-start gap-2 min-w-0">
                        <Checkbox
                          id={`group-${group.id}`}
                          className="mt-1"
                          checked={field.value.includes(group.id)}
                          onCheckedChange={(checked) => toggle(group.id, checked === true)}
                        />
                        <Label htmlFor={`group-${group.id}`} className="flex flex-col font-normal min-w-0 break-words">
                          <strong>{group.name}</strong>
                          {group.description && (
                            <span className="text-sm text-muted-foreground">{group.description}</span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                );
              }}
            />
          </>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.known_attributes'))}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('users:known_attributes_help')}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {userAttributeDefinitions.map((definition, index) => (
            <div key={definition.key} className="flex flex-col gap-2 min-w-0">
              <Label htmlFor={`known-${definition.key}`}>
                {capitalize(t(definition.labelKey))}
                <span className="block text-sm font-normal text-muted-foreground">{definition.key}</span>
              </Label>
              <Input id={`known-${definition.key}`} {...register(`knownAttributes.${index}.value`)} />
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <header className="flex gap-6 items-center flex-wrap">
          <div>
            <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.custom_attributes'))}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t('users:custom_attributes_help')}</p>
          </div>
          <Button type="button" size="sm" onClick={() => append(emptyCustomAttribute())}>
            <Plus className="size-4" />
            {capitalize(t('users:add_attribute'))}
          </Button>
        </header>

        {fields.length === 0 && <p className="text-muted-foreground">{t('users:no_custom_attributes')}</p>}

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-end flex-wrap">
            <div className="flex flex-col gap-2 grow">
              <Label htmlFor={`customAttributes.${index}.key`}>{capitalize(t('users:attribute.key'))}</Label>
              <Input id={`customAttributes.${index}.key`} {...register(`customAttributes.${index}.key`)} />
            </div>
            <div className="flex flex-col gap-2 grow">
              <Label htmlFor={`customAttributes.${index}.value`}>{capitalize(t('users:attribute.value'))}</Label>
              <Input id={`customAttributes.${index}.value`} {...register(`customAttributes.${index}.value`)} />
            </div>
            <div className="flex flex-col gap-2 grow">
              <Label htmlFor={`customAttributes.${index}.type`}>{capitalize(t('users:attribute.type'))}</Label>
              <Input id={`customAttributes.${index}.type`} {...register(`customAttributes.${index}.type`)} />
            </div>
            <div className="flex flex-col gap-2 grow">
              <Label htmlFor={`customAttributes.${index}.format`}>{capitalize(t('users:attribute.format'))}</Label>
              <Input id={`customAttributes.${index}.format`} {...register(`customAttributes.${index}.format`)} />
            </div>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="rounded-full shrink-0"
              aria-label={capitalize(t('users:remove_attribute'))}
              onClick={() => remove(index)}
            >
              <Trash className="size-4" />
            </Button>
          </div>
        ))}
      </section>
    </>
  );
};
