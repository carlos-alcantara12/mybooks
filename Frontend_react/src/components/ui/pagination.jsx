const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Pagination({ className, ...props }) {
  return <nav data-slot="pagination" className={joinClasses("ui-pagination", className)} {...props} />;
}

export function PaginationContent({ className, ...props }) {
  return <ul data-slot="pagination-content" className={joinClasses("ui-pagination__content", className)} {...props} />;
}

export function PaginationItem({ className, ...props }) {
  return <li data-slot="pagination-item" className={joinClasses("ui-pagination__item", className)} {...props} />;
}

export function PaginationLink({ active = false, className, children, ...props }) {
  return <button data-slot="pagination-link" type="button" aria-current={active ? "page" : undefined} className={joinClasses("ui-pagination__link", active && "is-active", className)} {...props}>{children}</button>;
}

export function PaginationPrevious(props) {
  return <PaginationLink aria-label="Ir para a página anterior" {...props}>anterior</PaginationLink>;
}

export function PaginationNext(props) {
  return <PaginationLink aria-label="Ir para a próxima página" {...props}>próxima</PaginationLink>;
}
