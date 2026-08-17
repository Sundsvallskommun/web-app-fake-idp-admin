import { useContext } from 'react';
import { SearchQueryContext } from './search-query.context';

/**
 * Renders `children` with every case-insensitive occurrence of the current search
 * query wrapped in a `<mark>`. With an empty query (or non-text children) the
 * children are rendered unchanged.
 */
export const HighlightedText: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const query = useContext(SearchQueryContext).trim().toLowerCase();
  const text = typeof children === 'string' || typeof children === 'number' ? String(children) : '';
  if (!query || !text) return <>{children}</>;

  const parts: React.ReactNode[] = [];
  const lower = text.toLowerCase();
  let i = 0;
  while (i < text.length) {
    const idx = lower.indexOf(query, i);
    if (idx === -1) {
      parts.push(text.slice(i));
      break;
    }
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} className="bg-yellow-200 text-foreground dark:bg-yellow-700 rounded-sm">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
  }
  // Render a single element rather than a fragment, so that a flex table cell can't
  // turn each part into a separately gapped flex item.
  return <span>{parts}</span>;
};
