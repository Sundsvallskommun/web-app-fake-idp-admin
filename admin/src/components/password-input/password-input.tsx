import { Input } from '@components/ui/input';
import { cn } from '@utils/cn';
import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

type PasswordInputProps = Omit<React.ComponentPropsWithoutRef<typeof Input>, 'type'>;

/**
 * Lösenordsfält med öga för att visa/dölja värdet. Detta är en test-IdP där
 * lösenorden är avsiktligt läsbara, så att kunna se vad som står är en feature.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const { t } = useTranslation();
    const label =
      visible ?
        t('common:hide_password', { defaultValue: 'Dölj lösenord' })
      : t('common:show_password', { defaultValue: 'Visa lösenord' });

    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pr-9', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={label}
          aria-pressed={visible}
          title={label}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ?
            <EyeOff className="size-4" aria-hidden="true" />
          : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
