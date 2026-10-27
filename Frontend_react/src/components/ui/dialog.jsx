import { forwardRef } from "react";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Dialog({ className, children, ...props }) {
  return <div data-slot="dialog" className={joinClasses("ui-dialog", className)} {...props}>{children}</div>;
}

export const DialogContent = forwardRef(function DialogContent({ as: Component = "section", className, ...props }, ref) {
  return <Component ref={ref} data-slot="dialog-content" className={joinClasses("ui-dialog__content", className)} {...props} />;
});

export function DialogHeader({ className, ...props }) {
  return <header data-slot="dialog-header" className={joinClasses("ui-dialog__header", className)} {...props} />;
}

export function DialogTitle({ as: Component = "h2", className, ...props }) {
  return <Component data-slot="dialog-title" className={joinClasses("ui-dialog__title", className)} {...props} />;
}

export function DialogDescription({ as: Component = "p", className, ...props }) {
  return <Component data-slot="dialog-description" className={joinClasses("ui-dialog__description", className)} {...props} />;
}

export const DialogClose = forwardRef(function DialogClose({ as: Component = "button", className, ...props }, ref) {
  return <Component ref={ref} data-slot="dialog-close" className={joinClasses("ui-dialog__close", className)} {...props} />;
});
