const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Badge({ variant = "default", className, ...props }) {
  return <span data-slot="badge" data-variant={variant} className={joinClasses("ui-badge", "ui-badge--" + variant, className)} {...props} />;
}
