const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export function Progress({ value = 0, max = 100, className, ...props }) {
  const percentage = Math.min(max, Math.max(0, Number(value) || 0));
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={max}
      aria-valuenow={percentage}
      className={joinClasses("ui-progress", className)}
      {...props}
    >
      <span style={{ width: (percentage / max) * 100 + "%" }} />
    </div>
  );
}
