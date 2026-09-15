import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { RevealableInput } from '@components/revealable-input/revealable-input';
import { Switch } from '@components/ui/switch';
import { Textarea } from '@components/ui/textarea';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

interface EditResourceInputProps extends Omit<InputProps, 'ref' | 'key'> {
  label: string;
  property: string;
  index: number;
  required?: boolean;
  /** Rendera som flerradig textarea istället för enradigt fält. */
  multiline?: boolean;
  /** Maskera värdet med visa/dölj-öga (för hemligheter som ändå går att läsa tillbaka). */
  secret?: boolean;
}

export const EditResourceInput: React.FC<EditResourceInputProps> = ({
  label,
  property,
  required,
  multiline,
  secret,
  ...rest
}) => {
  const { t } = useTranslation();
  const { register, watch, control } = useFormContext();
  const data = watch(property);
  const type = typeof data;

  if (type === 'object') return <></>;

  // Hemlighet: maskerad med samma öga som lösenord. Den redigeras normalt (tom =
  // backend genererar/behåller), men döljs tills operatören klickar fram den —
  // annars går den inte att läsa tillbaka för att konfigurera klienten.
  if (secret && type !== 'boolean') {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={property}>
          {label}
          {required && <span aria-hidden="true"> *</span>}
        </Label>
        <RevealableInput
          id={property}
          revealLabel={t('common:show_secret')}
          concealLabel={t('common:hide_secret')}
          placeholder={t('common:secret_generated_placeholder')}
          autoComplete="off"
          required={required}
          {...register(property)}
          {...rest}
        />
      </div>
    );
  }

  // Radix Switch är en <button>, inte en <input>, så `register()` kan inte binda
  // den — värdet måste gå via Controller.
  if (type === 'boolean') {
    return (
      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name={property}
          render={({ field }) => (
            <Switch id={property} checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
        <Label htmlFor={property}>{label}</Label>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={property}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      {multiline && type !== 'number' ?
        <Textarea id={property} rows={4} required={required} {...register(property)} />
      : <Input
          id={property}
          type={type === 'number' ? 'number' : 'text'}
          required={required}
          {...register(property)}
          {...rest}
        />
      }
    </div>
  );
};
