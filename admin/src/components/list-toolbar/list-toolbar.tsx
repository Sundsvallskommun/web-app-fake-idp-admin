import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import { Button, buttonVariants } from '@components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu';
import { cn } from '@utils/cn';
import { useLocalStorage } from '@utils/use-localstorage.hook';
import { FilePlus2, RefreshCcw, Settings } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { useShallow } from 'zustand/react/shallow';

interface ListToolbarProps {
  resource: ResourceName;
  onRefresh?: () => void;
  properties?: string[];
}

export const ListToolbar: React.FC<ListToolbarProps> = ({ onRefresh, resource, properties }) => {
  const { t } = useTranslation();
  const [{ [resource]: headers }, setHeaders] = useLocalStorage(
    useShallow((state) => [state.headers, state.setHeaders])
  );
  const { create, columns } = resources[resource];

  const label = (prop: string) =>
    capitalize(t(`${defaultInformationFields.includes(prop) ? 'common:' : `${resource}:properties.`}${prop}`));

  // Kolumnvalet skrivs rakt mot storen. Den tidigare react-hook-form-varianten
  // behövdes bara för att kunna binda flera <Checkbox> till ett fält.
  const toggle = (prop: string, checked: boolean) => {
    const selected = new Set(headers ?? []);
    if (checked) selected.add(prop);
    else selected.delete(prop);
    // Behåll `properties`-ordningen istället för klickordningen.
    setHeaders({ [resource]: (properties ?? []).filter((property) => selected.has(property)) });
  };

  return (
    <div className="absolute top-4 right-0 w-fit z-10 flex items-center gap-1">
      {!!create && (
        <Link
          href={`/${resource}/new`}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
          aria-label={capitalize(t('common:create_new', { resource: t(`${resource}:name_one`) }))}
        >
          <FilePlus2 className="size-4" />
        </Link>
      )}
      {!!onRefresh && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={capitalize(t('common:refresh'))}
          onClick={() => onRefresh()}
        >
          <RefreshCcw className="size-4" />
        </Button>
      )}
      {!columns && properties && headers && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={capitalize(t('common:columns', { defaultValue: 'Kolumner' }))}
            >
              <Settings className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {properties.map((prop) => (
              <DropdownMenuCheckboxItem
                key={`tab-prop-${prop}`}
                checked={headers.includes(prop)}
                onCheckedChange={(checked) => toggle(prop, checked)}
                onSelect={(event) => event.preventDefault()}
              >
                {label(prop)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
