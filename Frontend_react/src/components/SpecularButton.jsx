import { useEffect, useRef } from "react";
import "./SpecularButton.css";

/** React Bits inspired glass button with an edge highlight that follows the pointer. */
export default function SpecularButton({
  children,
  size = "md",
  radius = 8,
  tint = "#11131b",
  tintOpacity = 0.72,
  textColor = "#f2f3f7",
  lineColor = "#dce5ff",
  baseColor = "#59627b",
  intensity = 1,
  idleIntensity = 0.28,
  followMouse = true,
  disabled = false,
  type = "button",
  className = "",
  style,
  onClick,
  ...props
}) {
  const ref = useRef(null);

  useEffect(() => {
    const button = ref.current;
    if (!button || !followMouse) return undefined;

    const move = (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const angle = Math.atan2(y - rect.height / 2, x - rect.width / 2) * (180 / Math.PI) + 90;
      button.style.setProperty("--sb-angle", `${angle}deg`);
      button.style.setProperty("--sb-hover", "1");
    };
    const leave = () => button.style.setProperty("--sb-hover", "0");
    button.addEventListener("pointermove", move, { passive: true });
    button.addEventListener("pointerleave", leave, { passive: true });
    return () => {
      button.removeEventListener("pointermove", move);
      button.removeEventListener("pointerleave", leave);
    };
  }, [followMouse]);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`specular-button specular-button--${size}${className ? ` ${className}` : ""}`}
      style={{
        "--sb-radius": `${radius}px`,
        "--sb-tint": tint,
        "--sb-tint-opacity": tintOpacity,
        "--sb-text-color": textColor,
        "--sb-line-color": lineColor,
        "--sb-base-color": baseColor,
        "--sb-intensity": intensity,
        "--sb-idle-intensity": idleIntensity,
        ...style,
      }}
      {...props}
    >
      <span className="specular-button__light" aria-hidden="true" />
      <div className="specular-button__label">{children}</div>
    </button>
  );
}
