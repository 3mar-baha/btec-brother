"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";

export interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

const defaultFormat = (value: number) => value.toLocaleString("en-US");

export function AnimatedNumber({
  value,
  format = defaultFormat,
  duration = 1200,
  className,
}: AnimatedNumberProps) {
  const [rendered, setRendered] = useState(() => format(0));
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    const proxy = { value: 0 };
    const animation = animate(proxy, {
      value,
      duration,
      ease: "outExpo",
      onUpdate: () => setRendered(formatRef.current(proxy.value)),
      onComplete: () => setRendered(formatRef.current(value)),
    });

    return () => {
      animation.pause();
    };
  }, [value, duration]);

  return <span className={className}>{rendered}</span>;
}
