import { Button } from '@components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/ui/table';
import { ResourceColumn } from '@interfaces/resource';
import { cn } from '@utils/cn';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Row = Record<string, unknown>;

interface ListTableProps {
  columns: ResourceColumn[];
  data: Row[];
  pageSize?: number;
}

/**
 * Ersätter `AutoTable` från @sk-web-gui. Behåller det som AutoTable gav gratis:
 * sortering (med aria-sort), paginering, egna cell-renderare, sticky-kolumn och
 * visuellt dolda rubriker.
 */
export const ListTable: React.FC<ListTableProps> = ({ columns, data, pageSize = 15 }) => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableColumns = useMemo<ColumnDef<Row>[]>(
    () =>
      columns.map((column) => ({
        id: column.property,
        accessorFn: (row) => row[column.property],
        enableSorting: column.isColumnSortable !== false,
        header: () => column.label,
        cell: ({ row, getValue }) =>
          column.renderColumn ? column.renderColumn(getValue(), row.original) : (getValue() as React.ReactNode),
        meta: { column },
      })),
    [columns]
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  });

  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-4">
      {/* Ingen egen overflow-x-auto: shadcns Table har redan en inre scrollcontainer,
          och två nästlade gör sticky-kolumnen opålitlig. */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const meta = header.column.columnDef.meta as { column: ResourceColumn } | undefined;
                  const definition = meta?.column;
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  const label = flexRender(header.column.columnDef.header, header.getContext());

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        !sortable ? undefined
                        : sorted === 'asc' ? 'ascending'
                        : sorted === 'desc' ? 'descending'
                        : 'none'
                      }
                      className={cn(definition?.sticky && 'sticky right-0 bg-background text-right')}
                    >
                      {definition?.screenReaderOnly ?
                        <span className="sr-only">{label}</span>
                      : sortable ?
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8"
                          onClick={() => header.column.toggleSorting(sorted === 'asc')}
                        >
                          {label}
                          {sorted === 'asc' ?
                            <ArrowUp className="size-3.5 opacity-60" />
                          : sorted === 'desc' ?
                            <ArrowDown className="size-3.5 opacity-60" />
                          : <ArrowUpDown className="size-3.5 opacity-60" />}
                        </Button>
                      : label}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="group">
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta as { column: ResourceColumn } | undefined;
                  return (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        // Opak bakgrund som följer radhovern + vänsterkant, annars ser
                        // raden avklippt ut och scrollad text går visuellt in i kolumnen.
                        meta?.column.sticky && 'sticky right-0 bg-background group-hover:bg-muted border-l text-right'
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-3">
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {t('common:page_of', {
              defaultValue: 'Sida {{page}} av {{count}}',
              page: table.getState().pagination.pageIndex + 1,
              count: pageCount,
            })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label={t('common:previous_page', { defaultValue: 'Föregående sida' })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label={t('common:next_page', { defaultValue: 'Nästa sida' })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
