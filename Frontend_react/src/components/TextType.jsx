'use client';

import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import './TextType.css';

/** React Bits inspired typewriter wordmark with an animated GSAP caret. */
export default function TextType({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  cursorStyle = 'character',
  cursorCharacter = '|',
  cursorColor = 'currentColor',
  cursorBlinkDuration = 0.5,
  cursorGlide = true,
  typeEffect = 'none',
  textColors = [],
  onSentenceComplete,
  startOnVisible = false,
  ...props
}) {
  const sentences = useMemo(() => (Array.isArray(text) ? text : [text]).map(String), [text]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(!startOnVisible);
  const rootRef = useRef(null);
  const cursorRef = useRef(null);
  const caretRef = useRef(null);
  const previousPosition = useRef(null);
  const sentence = sentences[sentenceIndex % sentences.length] || '';
  const characters = Array.from(sentence);

  useEffect(() => {
    if (!startOnVisible || !rootRef.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.1 });
    observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);

  useEffect(() => {
    if (!visible) return undefined;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let timer;
    if (reduced && count < characters.length) {
      setCount(characters.length);
    } else if (count < characters.length) {
      timer = window.setTimeout(() => setCount((value) => value + 1), count === 0 ? initialDelay : typingSpeed);
    } else if (loop || sentenceIndex < sentences.length - 1) {
      timer = window.setTimeout(() => {
        onSentenceComplete?.(sentence, sentenceIndex);
        setCount(0);
        setSentenceIndex((value) => (value + 1) % sentences.length);
      }, reduced ? Math.min(pauseDuration, 300) : pauseDuration);
    }
    return () => window.clearTimeout(timer);
  }, [visible, count, characters.length, typingSpeed, initialDelay, pauseDuration, loop, sentenceIndex, sentences.length, sentence, onSentenceComplete]);

  useEffect(() => {
    const caret = caretRef.current;
    if (!caret || !cursorRef.current || !showCursor) return undefined;
    const moveCursor = () => {
      const node = cursorRef.current;
      const position = { x: caret.offsetLeft, y: caret.offsetTop };
      const previous = previousPosition.current;
      if (!previous || !cursorGlide || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set(node, position);
      } else {
        gsap.to(node, { ...position, duration: 0.12, ease: 'power3.out', overwrite: true });
      }
      previousPosition.current = position;
    };
    moveCursor();
    const observer = new ResizeObserver(moveCursor);
    if (rootRef.current) observer.observe(rootRef.current);
    return () => {
      observer.disconnect();
      gsap.killTweensOf(cursorRef.current);
    };
  }, [count, sentenceIndex, showCursor, cursorGlide]);

  useEffect(() => {
    const blink = cursorRef.current?.querySelector('.text-type__blink');
    if (!blink || !showCursor || cursorBlinkDuration <= 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tween = gsap.to(blink, { opacity: 0.18, duration: cursorBlinkDuration, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    return () => tween.kill();
  }, [showCursor, cursorBlinkDuration]);

  const chars = characters.slice(0, count).map((character, index) => (
    <span
      key={`${sentenceIndex}-${index}`}
      className="text-type__char"
      style={typeEffect === 'fade' ? { animation: 'text-type-fade 360ms both' } : undefined}
    >{character}</span>
  ));
  const cursorContent = cursorStyle === 'character' ? cursorCharacter : <span className="text-type__shape" />;
  return createElement(Component, { ref: rootRef, className: `text-type ${className}`, ...props },
    <span className="text-type__sr">{sentences.join(' ')}</span>,
    <span className="text-type__content" aria-hidden="true" style={{ color: textColors.length ? textColors[sentenceIndex % textColors.length] : undefined }}>
      {chars}<span ref={caretRef} className="text-type__caret">{'\u200B'}</span>
    </span>,
    showCursor && <span ref={cursorRef} aria-hidden="true" className={`text-type__cursor text-type__cursor--${cursorStyle}`} style={{ color: cursorColor }}>
      <span className="text-type__blink">{cursorContent}</span>
    </span>
  );
}
