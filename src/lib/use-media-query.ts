import { useEffect, useState } from 'react'

/**
 * Tracks a CSS media query from React.
 *
 * The initial value is read synchronously so the first paint already uses the
 * right layout (the app is client-only). It is used only where markup has to
 * differ — not for styling, which stays in Tailwind breakpoints.
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)

    setMatches(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Design breakpoint: < 768px is the mobile app layout. */
export const useIsMobile = (): boolean => useMediaQuery('(max-width: 767px)')
