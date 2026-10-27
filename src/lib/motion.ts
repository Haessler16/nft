/**
 * True when the visitor asked the OS to minimise motion (WCAG 2.3.3).
 *
 * CSS animations are neutralised globally in `index.css`; this helper exists for
 * the handful of JS-driven scrolls, where `behavior: 'smooth'` would otherwise
 * ignore the preference.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
