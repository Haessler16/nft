import { createFileRoute } from '@tanstack/react-router'

import { requireSession } from '@/app/guards'
import { ProfilePage } from '@/features/profile/components/profile-page'

export const Route = createFileRoute('/account/profile')({
  beforeLoad: requireSession,
  head: () => ({
    meta: [{ title: 'Perfil — NFT Market' }],
  }),
  component: ProfilePage,
})
