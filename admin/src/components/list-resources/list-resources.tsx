import { HighlightedText } from '@components/highlighted-text/highlighted-text.component';
import { SearchQueryContext } from '@components/highlighted-text/search-query.context';
import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { ResourceColumn } from '@interfaces/resource';
import { ResourceName } from '@interfaces/resource-name';
import { buttonVariants } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { ListTable } from './list-table';
import { cn } from '@utils/cn';
import { getFormattedFields } from '@utils/formatted-field';
import { matchesQuery } from '@utils/match-query';
import { useLocalStorage } from '@utils/use-localstorage.hook';
import { Check, Pencil, Plus, Search, X } from 'lucide-react';
import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from '@utils/capitalize';
import { useShallow } from 'zustand/react/shallow';

interface ListResourcesProps {
  resource: ResourceName;
  headers?: ResourceColumn[];
  data?: Array<Record<string, unknown>>;
}

export const ListResources: React.FC<ListResourcesProps> = ({ resource, headers: _headers, data }) => {
  const { update, create } = resources[resource];
  // Registret typar kolumnerna per resurs (ResourceColumn<AdminUser> osv.) så att
  // renderColumn-implementationerna typkontrolleras där de skrivs. Den här generiska
  // listan arbetar radtypslöst — typen raderas medvetet vid exakt en gräns.
  const columns = resources[resource].columns as ResourceColumn[] | undefined;
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [{ [resource]: storeHeaders }, setHeaders] = useLocalStorage(
    useShallow((state) => [state.headers, state.setHeaders])
  );

  useEffect(() => {
    if (!columns && !storeHeaders && data) {
      setHeaders({
        [resource]: [
          ...(defaultInformationFields || ['id']),
          ...(data?.[0] ? Object.keys(data[0]).filter((field) => typeof data[0][field] !== 'object') : []),
        ],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeHeaders, data]);

  const headers = useMemo(
    () =>
      _headers ||
      (columns &&
        columns.map((column) => ({
          ...column,
          label: column.label ?? capitalize(t(`${resource}:properties.${column.property}`)),
        }))) ||
      storeHeaders?.reduce<ResourceColumn[]>((headers, key) => {
        if (data) {
          const type = typeof data?.[0]?.[key];
          switch (type) {
            case 'string':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                },
              ];
            case 'number':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                },
              ];
            case 'boolean':
              return [
                ...headers,
                {
                  label: capitalize(
                    t(`${defaultInformationFields.includes(key) ? 'common:' : `${resource}:properties.`}${key}`)
                  ),
                  property: key,
                  renderColumn: (value) => (
                    <span>{!!value && <Check className="size-4 text-green-600 dark:text-green-500" />}</span>
                  ),
                  isColumnSortable: false,
                },
              ];
            default:
              return headers;
          }
        } else {
          return headers;
        }
      }, []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeHeaders, _headers, data, columns]
  );

  const editHeader: ResourceColumn = {
    label: 'edit',
    property: 'id',
    isColumnSortable: false,
    screenReaderOnly: true,
    sticky: true,
    renderColumn: (value) => (
      <div className="text-right w-full">
        <NextLink
          href={`/${resource}/${value}`}
          aria-label={capitalize(t('common:edit_row'))}
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
        >
          <Pencil className="size-4" />
        </NextLink>
      </div>
    ),
  };

  const translatedHeaders: ResourceColumn[] =
    headers?.map((header) =>
      typeof header === 'object' ?
        { ...header, label: header?.label || capitalize(t(`${resource}:properties.${header}`)) }
      : {
          label: t(`${resource}:properties.${header}`, { defaultValue: header }),
          property: header,
        }
    ) || [];

  // Highlight matched text in columns that don't already supply their own renderer
  // (boolean check icons, the edit pencil, and custom columns like `groups` keep theirs).
  const highlightedHeaders: ResourceColumn[] = translatedHeaders.map((header) =>
    header.renderColumn ? header : (
      { ...header, renderColumn: (value) => <HighlightedText>{value as React.ReactNode}</HighlightedText> }
    )
  );

  const formattedData = useMemo(() => data?.map((row) => getFormattedFields(row)), [data]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return formattedData;
    return formattedData?.filter((row) => matchesQuery(row, q));
  }, [formattedData, query]);

  return (
    <SearchQueryContext.Provider value={query}>
      {/* max-w-[32rem] var skriven för sk:s 10px-rot (320px) — max-w-80 ger samma bredd. */}
      <div className="relative mb-4 max-w-80">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={capitalize(t('common:filter'))}
          aria-label={capitalize(t('common:filter'))}
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
      {/* Skärmläsare får veta att filtret ändrade resultatet — DOM-bytet i
          tabellen annonseras inte av sig självt. */}
      <span aria-live="polite" className="sr-only">
        {t('common:result_count', { count: filteredData?.length ?? 0 })}
      </span>
      {filteredData && filteredData?.length > 0 ?
        <ListTable
          pageSize={15}
          data={filteredData}
          columns={[...highlightedHeaders, ...(update ? [editHeader] : [])]}
        />
      : <div className="flex flex-col items-start gap-3">
          <h3 className="text-2xl font-bold">
            {capitalize(t('common:no_resources', { resources: t(`${resource}:name_zero`) }))}
          </h3>
          {/* Tom-state med väg vidare, samma mönster som gruppväljarens
              "skapa den första gruppen"-länk. Visas inte vid aktivt filter —
              då är rätt åtgärd att rensa filtret, inte skapa. */}
          {!query && create && (
            <NextLink
              href={`/${resource}/new`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Plus className="size-4" />
              {capitalize(t('common:create_new', { resource: t(`${resource}:name_one`) }))}
            </NextLink>
          )}
        </div>
      }
    </SearchQueryContext.Provider>
  );
};
