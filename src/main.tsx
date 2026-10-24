import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { enableMocking } from '@/mocks'

import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Elemento #root não encontrado em index.html')
}

const bootstrap = async () => {
  // Mocks must be intercepting before the first request is issued.
  await enableMocking()

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
}

void bootstrap()
