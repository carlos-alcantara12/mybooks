import { forwardRef } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export const Button = forwardRef(function Button(
  { className, variant = "default", size = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={joinClasses("ui-button", `ui-button--${variant}`, `ui-button--${size}`, className)}
      {...props}
    />
  );
});
