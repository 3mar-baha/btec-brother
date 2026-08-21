"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate } from "animejs";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Subtle fade-and-slide on every route change (tab navigation included).
 * Wraps dashboard page content in the layout so it persists across renders.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = animate(el, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 260,
      ease: "outCubic",
    });

    return () => {
      animation.pause();
    };
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
