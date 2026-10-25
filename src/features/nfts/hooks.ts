import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { pruneCatalogSearch } from '@/features/nfts/catalog-search'

/**
 * Header search box with **real-time debounced search** (docs/PLAN.md → Seção 5).
 *
 * The input used to fire only on submit, so every refinement meant pressing
 * Enter. Now each keystroke schedules a navigation 350 ms later; the catalog
 * request itself is still a single `GET /api/nfts` per pause (never one per
 * key), and the in-flight query is cancelled by `signal` when the next pause
 * arrives, so out-of-order answers cannot paint a stale grid.
 *
 * History stays honest: typing inside the catalog `replace`s the entry (no
 * trail of `?q=g`, `?q=go`, `?q=gol`), while the first jump from another
 * screen pushes, so "voltar" returns to where the user came from. Enter (or
 * the "Buscar" button) flushes the pending timer immediately and keeps the
 * push behaviour a plain submit always had.
 */
export const SEARCH_DEBOUNCE_MS = 350

/** `q` is optional in the schema, and another route may carry foreign params. */
const readQ = (search: Record<string, unknown>): string =>
  typeof search.q === 'string' ? search.q : ''

export const useCatalogSearch = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState(() => readQ(location.search))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // A pending debounce must never fire after the header unmounts.
  useEffect(() => clearTimer, [])

  const goTo = (value: string, replace: boolean) => {
    void navigate({
      to: '/',
      search: (previous) => pruneCatalogSearch({ ...previous, q: value.trim(), page: 1 }),
      replace,
    })
  }

  const changeTerm = (value: string) => {
    setTerm(value)
    clearTimer()
    timer.current = setTimeout(() => {
      timer.current = null
      goTo(value, location.pathname === '/')
    }, SEARCH_DEBOUNCE_MS)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearTimer()
    goTo(term, false)
    setOpen(false)
  }

  /** Opening re-reads `?q=`, so filters applied elsewhere show up in the box. */
  const toggle = () => {
    if (!open) setTerm(readQ(location.search))
    setOpen(!open)
  }

  return {
    open,
    toggle,
    term,
    changeTerm,
    submit,
  }
}
