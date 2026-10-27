const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Skeleton({ className, ...props }) {
  return <span data-slot="skeleton" aria-hidden="true" className={joinClasses("ui-skeleton", className)} {...props} />;
}
