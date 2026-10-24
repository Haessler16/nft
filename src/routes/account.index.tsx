import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * `/account` has no screen of its own: it forwards to the profile tab.
 * A redirect route (instead of a not-found) keeps `/account` a valid entry point.
 */
export const Route = createFileRoute('/account/')({
  beforeLoad: () => {
    throw redirect({ to: '/account/profile', replace: true })
  },
})
