/**
 * Recursively checks whether any primitive value in `value` contains the
 * (already lower-cased) `query` substring. Walks nested objects and arrays
 * (`Object.values` of an array yields its elements), so nested fields such as a
 * user's `attributes` are matched too.
 */
export const matchesQuery = (value: unknown, query: string): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((v) => matchesQuery(v, query));
  }
  return String(value).toLowerCase().includes(query);
};
