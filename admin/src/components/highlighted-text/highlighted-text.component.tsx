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
      <mark key={idx} className="bg-warning-background-200 rounded-sm">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    i = idx + query.length;
  }
  // Render a single element: the table cell wrapper (`.sk-table-col-content`) is a
  // flex container with `gap-8`, so a fragment's multiple children would each become
  // a gapped flex item, adding whitespace around every <mark>.
  return <span>{parts}</span>;
};
