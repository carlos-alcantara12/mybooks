const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Alert({ className, variant = "default", role, ...props }) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      role={role || (variant === "destructive" ? "alert" : "status")}
      className={joinClasses("ui-alert", `ui-alert--${variant}`, className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }) {
  return <p data-slot="alert-description" className={joinClasses("ui-alert__description", className)} {...props} />;
}
