import { Checkbox } from '@components/ui/checkbox';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { capitalize } from '@utils/capitalize';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PickerItem {
  id: number;
  name: string;
  description?: string;
}

interface ResourcePickerProps {
  items: PickerItem[];
  value: number[];
  onChange: (ids: number[]) => void;
  /** Prefix för checkboxarnas id, t.ex. `group` → `group-3`. */
  idPrefix: string;
  /** aria-label för hela gruppen, t.ex. "Grupper och behörigheter". */
  label: string;
  searchLabel: string;
  noMatchLabel: string;
}

/**
 * Återanvändbar relationsväljare: fritextsökning med de värden som var valda
 * när formuläret öppnades överst.
 *
 * Ordningen fryses vid montering (`useState`-initieraren körs en gång) — den
 * som bockar i en rad ska inte se den hoppa upp under muspekaren mitt i
 * arbetet. Nästa gång formuläret öppnas ligger den där uppe.
 */
export const ResourcePicker: React.FC<ResourcePickerProps> = ({
  items,
  value,
  onChange,
  idPrefix,
  label,
  searchLabel,
  noMatchLabel,
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [initiallySelected] = useState(() => new Set(value));

  const normalizedQuery = query.trim().toLowerCase();
  const visible = items.filter(
    (item) =>
      !normalizedQuery ||
      item.name.toLowerCase().includes(normalizedQuery) ||
      (item.description ?? '').toLowerCase().includes(normalizedQuery)
  );
  const selected = visible.filter((item) => initiallySelected.has(item.id));
  const rest = visible.filter((item) => !initiallySelected.has(item.id));
  const showSections = selected.length > 0 && rest.length > 0;

  const toggle = (id: number, checked: boolean) =>
    onChange(checked ? [...value, id] : value.filter((selectedId) => selectedId !== id));

  const renderItem = (item: PickerItem) => (
    <div key={item.id} className="flex items-start gap-2 min-w-0">
      <Checkbox
        id={`${idPrefix}-${item.id}`}
        className="mt-1"
        checked={value.includes(item.id)}
        onCheckedChange={(checked) => toggle(item.id, checked === true)}
      />
      <Label htmlFor={`${idPrefix}-${item.id}`} className="flex flex-col font-normal min-w-0 break-words">
        <strong>{item.name}</strong>
        {item.description && <span className="text-sm text-muted-foreground">{item.description}</span>}
      </Label>
    </div>
  );

  return (
    <>
      <div className="relative max-w-80">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={capitalize(searchLabel)}
          aria-label={capitalize(searchLabel)}
          className="pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={capitalize(t('common:clear'))}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {visible.length === 0 ?
        <p className="text-muted-foreground">{noMatchLabel}</p>
      : <div role="group" aria-label={capitalize(label)} className="flex flex-col gap-3 max-h-80 overflow-y-auto">
          {showSections && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('common:picker.selected', { count: selected.length })}
            </p>
          )}
          {selected.map(renderItem)}
          {showSections && (
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground border-t pt-3">
              {t('common:picker.other', { count: rest.length })}
            </p>
          )}
          {rest.map(renderItem)}
        </div>
      }
    </>
  );
};
