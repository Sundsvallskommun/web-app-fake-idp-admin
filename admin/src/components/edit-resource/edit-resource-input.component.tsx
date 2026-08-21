import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Switch } from '@components/ui/switch';
import { Textarea } from '@components/ui/textarea';
import { Controller, useFormContext } from 'react-hook-form';

type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

interface EditResourceInputProps extends Omit<InputProps, 'ref' | 'key'> {
  label: string;
  property: string;
  index: number;
  required?: boolean;
  /** Rendera som flerradig textarea istället för enradigt fält. */
  multiline?: boolean;
}

export const EditResourceInput: React.FC<EditResourceInputProps> = ({
  label,
  property,
  required,
  multiline,
  ...rest
}) => {
  const { register, watch, control } = useFormContext();
  const data = watch(property);
  const type = typeof data;

  if (type === 'object') return <></>;

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
