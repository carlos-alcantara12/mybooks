import { createContext, useContext, useId, useState } from "react";

const TabsContext = createContext(null);
const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Tabs({ value, defaultValue, onValueChange, className, children, ...props }) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const setValue = (nextValue) => {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div data-slot="tabs" data-value={currentValue} className={joinClasses("ui-tabs", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }) {
  return <div data-slot="tabs-list" role="tablist" className={joinClasses("ui-tabs__list", className)} {...props} />;
}

export function TabsTrigger({ value, className, children, disabled, ...props }) {
  const context = useContext(TabsContext);
  const triggerId = useId();
  const selected = context?.value === value;

  function moveFocus(event) {
    if (!context || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const triggers = [...event.currentTarget.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]:not(:disabled)') || []];
    if (!triggers.length) return;
    const currentIndex = triggers.indexOf(event.currentTarget);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? triggers.length - 1
        : (currentIndex + (event.key === "ArrowLeft" ? -1 : 1) + triggers.length) % triggers.length;
    event.preventDefault();
    triggers[nextIndex].focus();
    triggers[nextIndex].click();
  }

  return (
    <button
      id={triggerId}
      data-slot="tabs-trigger"
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      className={joinClasses("ui-tabs__trigger", selected && "is-active", className)}
      onClick={() => context?.setValue(value)}
      onKeyDown={moveFocus}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children, ...props }) {
  const context = useContext(TabsContext);
  if (context?.value !== value) return null;
  return <div data-slot="tabs-content" role="tabpanel" className={joinClasses("ui-tabs__content", className)} {...props}>{children}</div>;
}
