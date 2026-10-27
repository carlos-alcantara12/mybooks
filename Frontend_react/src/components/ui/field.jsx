const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Field({ className, invalid = false, ...props }) {
  return (
    <div
      data-slot="field"
      data-invalid={invalid ? "true" : undefined}
      className={joinClasses("ui-field", className)}
      {...props}
    />
  );
}

export function FieldLabel({ className, ...props }) {
  return <label data-slot="field-label" className={joinClasses("ui-field__label", className)} {...props} />;
}

export function FieldDescription({ className, ...props }) {
  return <p data-slot="field-description" className={joinClasses("ui-field__description", className)} {...props} />;
}

export function FieldError({ className, ...props }) {
  return <p data-slot="field-error" role="alert" className={joinClasses("ui-field__error", className)} {...props} />;
}
