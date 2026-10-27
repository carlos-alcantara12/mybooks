const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Card({ as: Component = "div", className, size = "default", ...props }) {
  return <Component data-slot="card" data-size={size} className={joinClasses("ui-card", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
  return <div data-slot="card-header" className={joinClasses("ui-card__header", className)} {...props} />;
}

export function CardTitle({ as: Component = "h3", className, ...props }) {
  return <Component data-slot="card-title" className={joinClasses("ui-card__title", className)} {...props} />;
}

export function CardDescription({ as: Component = "p", className, ...props }) {
  return <Component data-slot="card-description" className={joinClasses("ui-card__description", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div data-slot="card-content" className={joinClasses("ui-card__content", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return <div data-slot="card-footer" className={joinClasses("ui-card__footer", className)} {...props} />;
}
