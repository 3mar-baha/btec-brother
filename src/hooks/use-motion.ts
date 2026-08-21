"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, spring, stagger } from "animejs";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Subtle staggered fade-in-up for all direct children of the returned ref.
 * Re-runs whenever an entry in `deps` changes (e.g. the list itself changes).
 */
export function useStaggeredEntrance<T extends HTMLElement>(
  deps: React.DependencyList = []
) {
  const ref = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;
    const items = Array.from(container.children) as HTMLElement[];
    if (items.length === 0) return;

    const animation = animate(items, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 500,
      ease: "outCubic",
      delay: stagger(60),
    });

    return () => {
      animation.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Fades a single element in on mount. */
export function useEntrance<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = animate(el, {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: 400,
      ease: "outCubic",
    });

    return () => {
      animation.pause();
    };
  }, []);

  return ref;
}

/** Spring scale micro-interaction for pressable elements (hover/press/release). */
export function useSpringPress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onMouseEnter = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1.03,
      duration: 220,
      ease: spring({ stiffness: 400, damping: 15 }),
    });
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1,
      duration: 260,
      ease: spring({ stiffness: 400, damping: 15 }),
    });
  };

  const onMouseDown = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 0.96,
      duration: 120,
      ease: spring({ stiffness: 500, damping: 20 }),
    });
  };

  const onMouseUp = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1,
      duration: 300,
      ease: spring({ stiffness: 500, damping: 18 }),
    });
  };

  return { ref, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp };
}

/** Continuous scale pulse while `active` is true (e.g. an urgent deadline). */
export function usePulse<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    const animation = animate(el, {
      scale: [1, 1.06, 1],
      duration: 1200,
      ease: "inOutSine",
      loop: true,
    });

    return () => {
      animation.revert();
    };
  }, [active]);

  return ref;
}
