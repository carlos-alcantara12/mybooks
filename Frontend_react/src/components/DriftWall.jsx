import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './DriftWall.css';

const EMPTY_ITEMS = [];
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const columnFactor = (index, variance) => 1 + variance * ((((index * 0.6180339887 + 0.35) % 1) * 2) - 1);

export default function DriftWall({
  items = EMPTY_ITEMS,
  columns = 5,
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  radius = 14,
  tilt = 16,
  turn = -14,
  roll = 0,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = 'up',
  variance = 0.45,
  parallax = 0.6,
  pauseOnHover = false,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  grayscale = false,
  overlayColor = '#060010',
  className = '',
  style,
  label = 'Capas de livros',
}) {
  const containerRef = useRef(null);
  const planeRef = useRef(null);
  const trackRefs = useRef([]);
  const rafRef = useRef(null);
  const offsetsRef = useRef([]);
  const velocitiesRef = useRef([]);
  const hoveredColRef = useRef(-1);
  const wallHoveredRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerDampedRef = useRef({ x: 0, y: 0 });
  const lastTsRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(280);
  const [activeId, setActiveId] = useState(null);
  const activeIdRef = useRef(null);
  const [reduced, setReduced] = useState(false);

  const validItems = useMemo(() => items.filter((item) => item?.image), [items]);
  const safeColumns = Math.max(1, Math.min(columns, Math.max(validItems.length, 1)));
  const columnItems = useMemo(() => {
    const cols = Array.from({ length: safeColumns }, () => []);
    validItems.forEach((item, index) => cols[index % safeColumns].push(item));
    return cols;
  }, [validItems, safeColumns]);
  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap;
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      const copies = Math.max(2, Math.ceil((containerHeight * 1.6) / copyHeight) + 1);
      return { copyHeight, copies };
    });
  }, [columnItems, tileHeight, gap, containerHeight]);
  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'up' ? 1 : -1;
    return columnItems.map((_, index) => speed * columnFactor(index, variance) * dirSign * (index % 2 === 0 ? 1 : -1));
  }, [columnItems, speed, direction, variance]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setContainerHeight(entry.contentRect.height || 280));
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, index) => meta.copyHeight * ((index * 0.37) % 1));
    velocitiesRef.current = columnItems.map(() => 0);
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback((px, py) => {
    if (!planeRef.current) return;
    planeRef.current.style.transform = `translate(-50%, -50%) scale(1.12) rotateX(${tilt + py}deg) rotateY(${turn + px}deg) rotateZ(${roll}deg) translateZ(${-depth}px)`;
  }, [tilt, turn, roll, depth]);

  useEffect(() => {
    const animate = (timestamp) => {
      if (lastTsRef.current === null) lastTsRef.current = timestamp;
      const delta = Math.min(0.05, Math.max(0, timestamp - lastTsRef.current) / 1000);
      lastTsRef.current = timestamp;

      const maxTilt = reduced ? 0 : parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damping = 1 - Math.exp(-delta / 0.12);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damping;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damping;
      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      if (!reduced) {
        for (let index = 0; index < trackRefs.current.length; index += 1) {
          const meta = columnMeta[index];
          if (!meta) continue;
          const paused = wallHoveredRef.current && pauseOnHover;
          const target = baseVelocities[index] * (paused || hoveredColRef.current === index ? 0 : 1);
          const easing = 1 - Math.exp(-delta / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[index] += (target - velocitiesRef.current[index]) * easing;
          let next = (offsetsRef.current[index] ?? 0) + velocitiesRef.current[index] * delta;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[index] = next;
          if (trackRefs.current[index]) trackRefs.current[index].style.transform = `translate3d(0, ${-next}px, 0)`;
        }
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    if (!validItems.length) return undefined;
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [validItems.length, baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform]);

  const activate = useCallback((id, index) => {
    activeIdRef.current = id;
    hoveredColRef.current = index;
    setActiveId(id);
  }, []);
  const release = useCallback(() => {
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    setActiveId(null);
  }, []);
  const handlePointerMove = useCallback((event) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (parallax > 0 && !reduced) {
      pointerRef.current = { x: (event.clientX - rect.left) / rect.width - 0.5, y: (event.clientY - rect.top) / rect.height - 0.5 };
    }
    const tile = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-tile-id]');
    if (!tile || tile.dataset.tileId === activeIdRef.current) return;
    activate(tile.dataset.tileId, Number(tile.dataset.col));
  }, [parallax, reduced, activate]);
  const handlePointerLeave = useCallback(() => {
    wallHoveredRef.current = false;
    pointerRef.current = { x: 0, y: 0 };
    release();
  }, [release]);
  const cssVars = useMemo(() => ({
    '--dw-tile-w': `${tileWidth}px`, '--dw-tile-h': `${tileHeight}px`, '--dw-gap': `${gap}px`,
    '--dw-radius': `${radius}px`, '--dw-perspective': `${perspective}px`, '--dw-lift': `${lift}px`,
    '--dw-dim': dim, '--dw-gray': grayscale ? 1 : 0, '--dw-overlay': overlayColor,
    '--dw-edge': `${Math.max(0, (1 - fade) * 100)}%`, ...style,
  }), [tileWidth, tileHeight, gap, radius, perspective, lift, dim, grayscale, overlayColor, fade, style]);

  if (!validItems.length) return null;
  const rootClass = ['drift-wall', reduced ? 'drift-wall--reduced' : '', className].filter(Boolean).join(' ');
  return (
    <div ref={containerRef} className={rootClass} style={cssVars} onPointerMove={handlePointerMove} onPointerEnter={() => { wallHoveredRef.current = true; }} onPointerLeave={handlePointerLeave} role="group" aria-label={label}>
      <div ref={planeRef} className="drift-wall__plane">
        {columnItems.map((column, columnIndex) => {
          const meta = columnMeta[columnIndex];
          return <div className="drift-wall__col" key={`col-${columnIndex}`}><div className="drift-wall__track" ref={(element) => { trackRefs.current[columnIndex] = element; }}>
            {Array.from({ length: meta.copies }, (_, copyIndex) => column.map((item, itemIndex) => {
              const id = `${columnIndex}-${copyIndex}-${itemIndex}`;
              const tile = <span className="drift-wall__inner"><img src={item.image} alt={item.title ?? ''} loading="lazy" decoding="async" draggable={false} /><span className="drift-wall__overlay" aria-hidden="true" /></span>;
              const common = { className: `drift-wall__tile${activeId === id ? ' is-active' : ''}`, 'data-tile-id': id, 'data-col': columnIndex, onFocus: () => activate(id, columnIndex), onBlur: release };
              return item.href
                ? <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...common}>{tile}</a>
                : <div key={id} {...common}>{tile}</div>;
            }))}
          </div></div>;
        })}
      </div>
    </div>
  );
}
