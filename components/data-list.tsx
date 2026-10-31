'use client'

import { useMemo, useState } from 'react'
import {
  ContentSwitcher,
  DataTableSkeleton,
  Pagination,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  TableToolbar,
  TableToolbarContent,
  TableToolbarSearch,
} from '@carbon/react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
}

export interface ListFilter<T> {
  label: string
  match: (row: T) => boolean
}

interface DataListProps<T extends { id: number | string }> {
  title?: string
  description?: string
  rows: T[]
  columns: Column<T>[]
  loading?: boolean
  /** Aramada kullanılacak metin alanları. */
  searchText: (row: T) => string
  searchPlaceholder?: string
  /** Araç çubuğundaki seçenekler; ilki varsayılandır. */
  filters?: ListFilter<T>[]
  /** Satırın en sağında gösterilen eylemler (genellikle OverflowMenu). */
  renderActions?: (row: T) => React.ReactNode
  toolbarActions?: React.ReactNode
  /** Verilirse satırın tamamı tıklanabilir olur (eylem hücresi hariç). */
  onRowClick?: (row: T) => void
  /** Hiç kayıt yokken (arama dışında) gösterilecek içerik; yükleme hatasında null verilir. */
  emptyState: React.ReactNode
}

const PAGE_SIZES = [10, 25, 50, 100]

/** Arama ve sayfalama içeren Carbon tablo; tüm liste sayfaları bunu kullanır. */
export default function DataList<T extends { id: number | string }>({
  title,
  description,
  rows,
  columns,
  loading,
  searchText,
  searchPlaceholder = 'Ara',
  filters,
  renderActions,
  toolbarActions,
  onRowClick,
  emptyState,
}: DataListProps<T>) {
  const [query, setQuery] = useState('')
  const [filterIndex, setFilterIndex] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const filter = filters?.[filterIndex]
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('tr')
    return rows.filter(
      (row) => (!filter || filter.match(row)) && (!term || searchText(row).toLocaleLowerCase('tr').includes(term)),
    )
  }, [rows, query, searchText, filter])

  // Silme/arama sonrası mevcut sayfa boş kalırsa son dolu sayfaya dön.
  const lastPage = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const headerCount = columns.length + (renderActions ? 1 : 0)

  if (loading) {
    return <DataTableSkeleton columnCount={headerCount} rowCount={5} showHeader={Boolean(title)} />
  }

  if (rows.length === 0) {
    return <>{emptyState}</>
  }

  return (
    <TableContainer title={title} description={description}>
      <TableToolbar aria-label="Tablo araç çubuğu">
        {filters && (
          <ContentSwitcher
            className="data-list__filters"
            size="md"
            selectedIndex={filterIndex}
            onChange={({ index }) => {
              setFilterIndex(index ?? 0)
              setPage(1)
            }}
          >
            {filters.map((f) => (
              <Switch key={f.label} name={f.label} text={`${f.label} (${rows.filter(f.match).length})`} />
            ))}
          </ContentSwitcher>
        )}
        <TableToolbarContent>
          <TableToolbarSearch
            persistent
            placeholder={searchPlaceholder}
            labelText={searchPlaceholder}
            onChange={(_event, value) => {
              setQuery(value ?? '')
              setPage(1)
            }}
          />
          {toolbarActions}
        </TableToolbarContent>
      </TableToolbar>
      <Table size="lg" useZebraStyles={false}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableHeader key={column.key}>{column.header}</TableHeader>
            ))}
            {renderActions && (
              <TableHeader>
                <span className="cds--visually-hidden">Eylemler</span>
              </TableHeader>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {visible.length === 0 ? (
            <TableRow>
              <TableCell colSpan={headerCount}>{query ? `“${query}” için sonuç bulunamadı.` : 'Bu görünümde kayıt yok.'}</TableCell>
            </TableRow>
          ) : (
            visible.map((row) => (
              <TableRow
                key={row.id}
                {...(onRowClick && {
                  className: 'row-clickable',
                  tabIndex: 0,
                  onClick: () => onRowClick(row),
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.target !== event.currentTarget) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onRowClick(row)
                    }
                  },
                })}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.render(row)}</TableCell>
                ))}
                {renderActions && (
                  <TableCell className="cell-actions-col" onClick={(event) => event.stopPropagation()}>
                    <div className="cell-actions">{renderActions(row)}</div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {filtered.length > PAGE_SIZES[0] && (
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          pageSizes={PAGE_SIZES}
          totalItems={filtered.length}
          itemsPerPageText="Sayfa başına:"
          itemRangeText={(min, max, total) => `${min}–${max} / ${total} kayıt`}
          pageRangeText={(_current, total) => `/ ${total} sayfa`}
          backwardText="Önceki sayfa"
          forwardText="Sonraki sayfa"
          onChange={({ page: nextPage, pageSize: nextSize }) => {
            setPage(nextPage)
            setPageSize(nextSize)
          }}
        />
      )}
    </TableContainer>
  )
}

interface EmptyStateProps {
  title: string
  body: string
  action?: React.ReactNode
}

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__body">{body}</p>
      {action}
    </div>
  )
}
