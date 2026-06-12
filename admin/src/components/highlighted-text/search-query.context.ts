import { createContext } from 'react';

/**
 * Carries the active list filter query so cell renderers can highlight matches.
 * Lives in context because `AutoTable`'s `renderColumn(value, item)` signature is
 * fixed — there's no way to thread the query in as an argument.
 */
export const SearchQueryContext = createContext('');
