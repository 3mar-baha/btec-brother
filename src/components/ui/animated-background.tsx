"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";

/**
 * Ambient animated background: soft brand-tinted blobs that drift, breathe and
 * cross the viewport on a slow loop. Sits behind all content (pointer-events
 * none, negative z-index) so it never intercepts interaction.
 */
export function AnimatedBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const blobs = Array.from(root.children) as HTMLElement[];
    if (blobs.length === 0) return;

    const animations = blobs.map((blob, i) =>
      animate(blob, {
        translateX: [0, i % 2 === 0 ? 80 : -80, 0],
        translateY: [0, i % 2 === 0 ? -60 : 60, 0],
        scale: [1, 1.2, 1],
        duration: 10000 + i * 2500,
        ease: "inOutSine",
        loop: true,
      })
    );

    return () => {
      animations.forEach((a) => a.pause());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute top-1/3 -right-32 h-[28rem] w-[28rem] rounded-full bg-brand/10 blur-3xl" />
      <div className="absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
    </div>
  );
}
