import { createFileRoute } from '@tanstack/react-router'

import { requireSession } from '@/app/guards'
import { WalletsPage } from '@/features/wallets/components/wallets-page'

export const Route = createFileRoute('/account/wallets')({
  beforeLoad: requireSession,
  head: () => ({
    meta: [{ title: 'Carteiras — NFT Market' }],
  }),
  component: WalletsPage,
})
