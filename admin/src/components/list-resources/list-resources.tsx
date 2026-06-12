import { HighlightedText } from '@components/highlighted-text/highlighted-text.component';
import { SearchQueryContext } from '@components/highlighted-text/search-query.context';
import { defaultInformationFields } from '@config/defaults';
import resources from '@config/resources';
import { ResourceName } from '@interfaces/resource-name';
import { AutoTable, AutoTableHeader, Icon, SearchField } from '@sk-web-gui/react';
import { getFormattedFields } from '@utils/formatted-field';
import { matchesQuery } from '@utils/match-query';
import { useLocalStorage } from '@utils/use-localstorage.hook';
import { Check, Pencil } from 'lucide-react';
import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { capitalize } from 'underscore.string';
import { useShallow } from 'zustand/react/shallow';

interface ListResourcesProps {
  resource: ResourceName;
  headers?: AutoTableHeader[];
  data?: Array<Record<string, unknown>>;
}

export const ListResources: React.FC<ListResourcesProps> = ({ resource, headers: _headers, data }) => {
  const { update, columns } = resources[resource];
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
      storeHeaders?.reduce<AutoTableHeader[]>((headers, key) => {
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
                    <span>{value && <Icon.Padded rounded color="success" icon={<Check />} />}</span>
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

  const editHeader: AutoTableHeader = {
    label: 'edit',
    property: 'id',
    isColumnSortable: false,
    screenReaderOnly: true,
    sticky: true,
    renderColumn: (value) => (
      <div className="text-right w-full">
        <NextLink href={`/${resource}/${value}`} aria-label="Redigera">
          <Icon.Padded icon={<Pencil />} variant="tertiary" className="link-btn" />
        </NextLink>
      </div>
    ),
  };

  const translatedHeaders: AutoTableHeader[] =
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
  const highlightedHeaders: AutoTableHeader[] = translatedHeaders.map((header) =>
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
      <SearchField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onReset={() => setQuery('')}
        showSearchButton={false}
        placeholder={capitalize(t('common:filter'))}
        className="mb-16 max-w-[32rem]"
      />
      {filteredData && filteredData?.length > 0 ?
        <AutoTable
          pageSize={15}
          autodata={filteredData}
          autoheaders={[...highlightedHeaders, ...(update ? [editHeader] : [])]}
        />
      : <h3>{capitalize(t('common:no_resources', { resources: t(`${resource}:name_zero`) }))}</h3>}
    </SearchQueryContext.Provider>
  );
};
