import { Button } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import * as React from 'react';

const schemes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  // next-themes vet inte vilket tema som gäller förrän efter hydrering; rendera
  // ett stabilt värde på servern för att undvika hydration mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const active = schemes.find((scheme) => scheme.value === theme) ?? schemes[2];
  const ActiveIcon = mounted ? active.icon : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <ActiveIcon className="size-4" />
          <span>{mounted ? capitalize(t(`layout:color_schemes.${active.value}`)) : capitalize(t('layout:color_scheme'))}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {schemes.map(({ value, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            role="menuitemradio"
            aria-checked={mounted && theme === value}
            className="justify-between"
          >
            <span className="flex items-center gap-2">
              <Icon className="size-4" />
              {capitalize(t(`layout:color_schemes.${value}`))}
            </span>
            {mounted && theme === value && <Check className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
