"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, spring, stagger } from "animejs";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Dramatic staggered entrance: children scale up from below with an elastic
 * overshoot. Re-runs whenever an entry in `deps` changes (e.g. the list itself).
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
      translateY: [48, 0],
      scale: [0.9, 1],
      duration: 800,
      ease: "outBack",
      delay: stagger(90),
    });

    return () => {
      animation.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Single-element dramatic entrance on mount (scale + slide + overshoot). */
export function useEntrance<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = animate(el, {
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.92, 1],
      duration: 750,
      ease: "outBack",
    });

    return () => {
      animation.pause();
    };
  }, []);

  return ref;
}

/** Entrance + hover lift, combined so a single element owns its transform. */
export function useCardMotion<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const animation = animate(el, {
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.92, 1],
      duration: 750,
      ease: "outBack",
    });

    return () => {
      animation.pause();
    };
  }, []);

  const onMouseEnter = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      translateY: -10,
      scale: 1.03,
      duration: 300,
      ease: spring({ stiffness: 300, damping: 12 }),
    });
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      translateY: 0,
      scale: 1,
      duration: 450,
      ease: spring({ stiffness: 200, damping: 14 }),
    });
  };

  return { ref, onMouseEnter, onMouseLeave };
}

/** Hover lift + scale for cards whose entrance is handled elsewhere. */
export function useHoverLift<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onMouseEnter = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      translateY: -10,
      scale: 1.03,
      duration: 300,
      ease: spring({ stiffness: 300, damping: 12 }),
    });
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      translateY: 0,
      scale: 1,
      duration: 450,
      ease: spring({ stiffness: 200, damping: 14 }),
    });
  };

  return { ref, onMouseEnter, onMouseLeave };
}

/** Elastic spring micro-interaction for pressable elements (hover/press/release). */
export function useSpringPress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  const onMouseEnter = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1.06,
      duration: 260,
      ease: spring({ stiffness: 400, damping: 12 }),
    });
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1,
      duration: 420,
      ease: spring({ stiffness: 300, damping: 12 }),
    });
  };

  const onMouseDown = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 0.92,
      duration: 140,
      ease: spring({ stiffness: 500, damping: 16 }),
    });
  };

  const onMouseUp = () => {
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: 1,
      duration: 500,
      ease: spring({ stiffness: 400, damping: 10 }),
    });
  };

  return { ref, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp };
}

/** Stronger continuous scale pulse while `active` is true (e.g. urgent deadline). */
export function usePulse<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;

    const animation = animate(el, {
      scale: [1, 1.1, 1],
      duration: 900,
      ease: "inOutSine",
      loop: true,
    });

    return () => {
      animation.revert();
    };
  }, [active]);

  return ref;
}
