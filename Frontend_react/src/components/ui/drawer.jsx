const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Drawer({ className, ...props }) {
  return <div data-slot="drawer" className={joinClasses("ui-drawer", className)} {...props} />;
}

export function DrawerHandle({ className, ...props }) {
  return <span data-slot="drawer-handle" aria-hidden="true" className={joinClasses("ui-drawer__handle", className)} {...props} />;
}

export function DrawerContent({ className, ...props }) {
  return <div data-slot="drawer-content" className={joinClasses("ui-drawer__content", className)} {...props} />;
}
