import { AdminGroup } from '@data-contracts/backend/data-contracts';
import { ResourcePicker } from '@components/resource-picker/resource-picker.component';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { RevealableInput } from '@components/revealable-input/revealable-input';
import { ResourceError } from '@components/resource-error/resource-error.component';
import { useResource } from '@utils/use-resource';
import { Loader2, Plus, Trash } from 'lucide-react';
import NextLink from 'next/link';
import { Control, Controller, UseFormRegister, UseFormResetField, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { applicationsForGroups, emptyCustomAttribute, UserForm } from './user-form.model';
import { userAttributeDefinitions, userPropertyDefinitions } from './user-form.schema';

type UserFormFieldsProps = {
  control: Control<UserForm>;
  register: UseFormRegister<UserForm>;
  resetField: UseFormResetField<UserForm>;
  revealCitizenIdentifier?: () => Promise<string>;
};

export const UserFormFields: React.FC<UserFormFieldsProps> = ({
  control,
  register,
  resetField,
  revealCitizenIdentifier,
}) => {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'customAttributes' });
  const {
    data: groupData,
    loaded: groupsLoaded,
    loading: groupsLoading,
    error: groupsError,
    refresh: refreshGroups,
  } = useResource('groups');
  const groups = groupData as AdminGroup[];
  const selectedGroupIds = useWatch({ control, name: 'groupIds' }) ?? [];
  const applications = applicationsForGroups(groups, selectedGroupIds);

  return (
    <>
      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.account'))}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('users:account_help')}</p>
        </header>
        {userPropertyDefinitions.map((definition) => (
          <div key={definition.key} className="flex flex-col gap-2">
            <Label htmlFor={`user-${definition.key}`}>
              {capitalize(t(definition.labelKey))}
              {definition.required && <span aria-hidden="true"> *</span>}
            </Label>
            {definition.inputType === 'password' ?
              <RevealableInput
                id={`user-${definition.key}`}
                required={definition.required}
                autoComplete="off"
                revealLabel={t('common:show_password')}
                concealLabel={t('common:hide_password')}
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
        {groupsError && groups.length === 0 && (
          <ResourceError resources={t('groups:name_many')} onRetry={refreshGroups} />
        )}
        {!groupsError && groupsLoaded && groups.length === 0 && (
          <p className="text-muted-foreground">
            {t('users:no_groups')}{' '}
            <NextLink href="/groups/new" className="underline">
              {t('users:create_group')}
            </NextLink>
          </p>
        )}
        {groups.length > 0 && (
          <Controller
            control={control}
            name="groupIds"
            render={({ field }) => (
              <ResourcePicker
                items={groups}
                value={field.value}
                onChange={field.onChange}
                idPrefix="group"
                label={t('users:sections.groups')}
                searchLabel={t('users:filter_groups')}
                noMatchLabel={t('users:no_matching_groups')}
              />
            )}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.applications'))}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('users:applications_help')}</p>
        </header>
        {applications.length === 0 ?
          <p className="text-muted-foreground">{t('users:no_application_access')}</p>
        : <div className="flex flex-wrap gap-2" aria-label={t('users:sections.applications')}>
            {applications.map((application) => (
              <Badge key={application.id} variant="secondary">
                {application.name}
              </Badge>
            ))}
          </div>
        }
      </section>

      <section className="flex flex-col gap-4">
        <header>
          <h2 className="text-xl font-bold mb-0">{capitalize(t('users:sections.known_attributes'))}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('users:known_attributes_help')}</p>
        </header>

        {/* Grupperat i standard vs alias: 13 platta fält där fyra betyder
            "användar-id" var omöjliga att tyda. Register-index måste ändå följa
            userAttributeDefinitions ordning, därav indexOf. */}
        {(['standard', 'alias'] as const).map((group) => (
          <div key={group} className="flex flex-col gap-3">
            <header>
              <h3 className="font-semibold">{t(`users:known_attributes_groups.${group}`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`users:known_attributes_groups.${group}_help`)}</p>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              {userAttributeDefinitions
                .filter((definition) => definition.group === group)
                .map((definition) => {
                  const index = userAttributeDefinitions.indexOf(definition);
                  const help = t(`${definition.labelKey}_help`, { defaultValue: '' });
                  return (
                    // The parent grid stretches both fields in a column pair to the
                    // same height. The flexible help row then absorbs differing copy
                    // lengths while every control remains anchored to the final row.
                    <div
                      key={definition.key}
                      className="grid min-w-0 grid-rows-[auto_1fr_auto] gap-1.5"
                    >
                      <Label htmlFor={`known-${definition.key}`}>
                        {capitalize(t(definition.labelKey))}
                        <span className="block text-sm font-normal text-muted-foreground break-words">
                          {definition.key}
                        </span>
                      </Label>
                      {help && <p className="row-start-2 text-xs text-muted-foreground">{help}</p>}
                      <div className="row-start-3">
                        {definition.key === 'citizenIdentifier' && revealCitizenIdentifier ?
                          <Controller
                            control={control}
                            name={`knownAttributes.${index}.value`}
                            render={({ field }) => (
                              <RevealableInput
                                {...field}
                                value={field.value ?? ''}
                                id={`known-${definition.key}`}
                                autoComplete="off"
                                revealLabel={t('users:show_citizen_identifier')}
                                concealLabel={t('users:hide_citizen_identifier')}
                                loadValue={async () => {
                                  const value = await revealCitizenIdentifier();
                                  resetField(`knownAttributes.${index}.value`, { defaultValue: value });
                                }}
                              />
                            )}
                          />
                        : <Input
                            id={`known-${definition.key}`}
                            {...register(`knownAttributes.${index}.value`)}
                          />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
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
