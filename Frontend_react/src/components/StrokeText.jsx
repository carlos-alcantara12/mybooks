import { useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import "./StrokeText.css";

/** Draws an SVG wordmark outline, then reveals its fill. */
export default function StrokeText({
  text,
  strokeColor = "#93a7ff",
  fillColor = "currentColor",
  strokeWidth = 1.2,
  drawDuration = 1.15,
  fillDelay = 0.12,
  stagger = 0.035,
  ease = "power2.out",
  fontSize = 36,
  fontWeight = 400,
  fontFamily = "inherit",
  letterSpacing = 0,
  className = "",
  style = {},
}) {
  const rootRef = useRef(null);
  const outlineRef = useRef(null);
  const fillRef = useRef(null);
  const wipeRef = useRef(null);
  const [box, setBox] = useState(null);
  const clipId = `stroke-text-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const characters = useMemo(() => Array.from(String(text ?? "")), [text]);
  const fontStyle = { fontFamily, fontSize: `${fontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` };
  const label = String(text ?? "");

  useLayoutEffect(() => {
    const textNode = outlineRef.current;
    const root = rootRef.current;
    if (!textNode || !root) return undefined;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const bounds = textNode.getBBox();
      if (!bounds.width || !bounds.height) return;
      const padding = Math.max(3, strokeWidth * 2);
      const next = {
        x: bounds.x - padding,
        y: bounds.y - padding,
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      };
      setBox((previous) => previous
        && Math.abs(previous.x - next.x) < 0.5
        && Math.abs(previous.y - next.y) < 0.5
        && Math.abs(previous.width - next.width) < 0.5
        && Math.abs(previous.height - next.height) < 0.5
        ? previous
        : next);
    };
    measure();
    document.fonts?.ready?.then(measure).catch(() => {});
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [characters, fontFamily, fontSize, fontWeight, letterSpacing, strokeWidth]);

  useLayoutEffect(() => {
    if (!box || !outlineRef.current || !fillRef.current) return undefined;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const outlines = [...outlineRef.current.querySelectorAll("[data-stroke-char]")];
    const fills = [...fillRef.current.querySelectorAll("[data-fill-char]")];
    const dash = Math.max(fontSize * 8, 240);
    const targets = [...outlines, ...fills, wipeRef.current].filter(Boolean);
    gsap.killTweensOf(targets);

    if (reduceMotion) {
      gsap.set(outlines, { strokeDasharray: dash, strokeDashoffset: 0 });
      gsap.set(wipeRef.current, { attr: { x: box.x, width: box.width } });
      return () => gsap.killTweensOf(targets);
    }

    gsap.set(outlines, { strokeDasharray: dash, strokeDashoffset: dash });
    gsap.set(wipeRef.current, { attr: { x: box.x, y: box.y, width: 0, height: box.height } });
    const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
    timeline
      .to(outlines, { strokeDashoffset: 0, duration: drawDuration, ease, stagger })
      .to(wipeRef.current, { attr: { x: box.x, width: box.width }, duration: Math.max(0.38, drawDuration * 0.44), ease: "power2.inOut" }, `+=${fillDelay}`);
    return () => {
      timeline.kill();
      gsap.killTweensOf(targets);
    };
  }, [box, drawDuration, ease, fillDelay, fontSize, stagger]);

  const viewBox = box ? `${box.x} ${box.y} ${box.width} ${box.height}` : `0 ${-fontSize} 600 ${fontSize * 1.4}`;
  return (
    <span
      ref={rootRef}
      className={`stroke-text ${className}`.trim()}
      style={{ ...style, "--stroke-text-width": `${box?.width || 600}px` }}
      role="img"
      aria-label={label}
    >
      <svg className="stroke-text__svg" viewBox={viewBox} preserveAspectRatio="xMinYMid meet" aria-hidden="true" style={box ? undefined : { visibility: "hidden" }}>
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            <rect ref={wipeRef} x={box?.x || 0} y={box?.y || 0} width="0" height={box?.height || fontSize} />
          </clipPath>
        </defs>
        <text
          ref={outlineRef}
          className="stroke-text__stroke"
          x="0"
          y="0"
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={fontStyle}
        >
          {characters.map((character, index) => <tspan data-stroke-char key={`stroke-${index}`}>{character}</tspan>)}
        </text>
        <text
          ref={fillRef}
          className="stroke-text__fill"
          x="0"
          y="0"
          fill={fillColor}
          stroke="none"
          clipPath={`url(#${clipId})`}
          style={fontStyle}
        >
          {characters.map((character, index) => <tspan data-fill-char key={`fill-${index}`}>{character}</tspan>)}
        </text>
      </svg>
    </span>
  );
}
