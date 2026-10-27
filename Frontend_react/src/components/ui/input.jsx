import { forwardRef } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      data-slot="input"
      className={joinClasses("ui-input", className)}
      {...props}
    />
  );
});
