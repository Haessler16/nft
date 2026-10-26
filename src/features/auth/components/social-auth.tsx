import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

const GoogleMark = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4">
    <path
      fill="#4285F4"
      d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"
    />
    <path
      fill="#34A853"
      d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.6A10 10 0 0 0 12 22Z"
    />
    <path
      fill="#FBBC05"
      d="M6.41 13.92a6 6 0 0 1 0-3.84v-2.6H3.07a10 10 0 0 0 0 9.04l3.34-2.6Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.93 5.48l3.34 2.6C7.2 7.72 9.4 5.96 12 5.96Z"
    />
  </svg>
)

const FacebookMark = () => (
  <span
    aria-hidden
    className="grid size-4 place-items-center rounded-full bg-[#1877F2] text-[11px] leading-none font-bold text-white"
  >
    f
  </span>
)

/**
 * Social entry points from the mobile auth frames. They are intentionally
 * simulated: the demo has no OAuth provider, so the buttons explain that.
 */
export const SocialAuth = () => {
  const outOfScope = () =>
    toast.info('Login social não faz parte desta demonstração. Use e-mail e senha.')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-[0.7rem] text-muted-foreground">
        <span className="h-px flex-1 bg-border/70" />
        <span>Ou continue com</span>
        <span className="h-px flex-1 bg-border/70" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-lg border-border/70 text-sm font-normal"
        onClick={outOfScope}
      >
        <GoogleMark />
        Continuar com Google
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full rounded-lg border-border/70 text-sm font-normal"
        onClick={outOfScope}
      >
        <FacebookMark />
        Continuar com Facebook
      </Button>
    </div>
  )
}
