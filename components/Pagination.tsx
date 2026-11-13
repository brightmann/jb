import Link from 'next/link'

// Numbered pager: Previous | 1 | 2 | … | N | Next, 5 posts per page.
// Hidden when there is only one page. Page 1 links to /, page N to /page/N.
export default function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const pageUrl = (page: number) => (page === 1 ? '/' : `/page/${page}`)

  // Build the list of page numbers to show, with ellipsis for many pages.
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (currentPage > 3) pages.push('…')
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  const base =
    'px-3 py-1.5 rounded-md text-sm transition-colors duration-200'
  const linkCls = `${base} text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`
  const currentCls = `${base} bg-primary-500 text-white font-semibold`
  const disabledCls = `${base} text-gray-400 dark:text-gray-500 cursor-default`

  return (
    <nav
      aria-label='Pagination'
      className='flex items-center justify-center flex-wrap gap-1.5 mt-8 mb-4'
    >
      {currentPage > 1 ? (
        <Link href={pageUrl(currentPage - 1)} className={linkCls}>
          Previous
        </Link>
      ) : (
        <span className={disabledCls}>Previous</span>
      )}

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className={disabledCls}>
            …
          </span>
        ) : p === currentPage ? (
          <span key={p} className={currentCls} aria-current='page'>
            {p}
          </span>
        ) : (
          <Link key={p} href={pageUrl(p)} className={linkCls}>
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link href={pageUrl(currentPage + 1)} className={linkCls}>
          Next
        </Link>
      ) : (
        <span className={disabledCls}>Next</span>
      )}
    </nav>
  )
}
