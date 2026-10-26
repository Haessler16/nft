import { useState, useMemo } from 'react'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { Wallet } from '@/features/wallets/api/contracts'

interface WalletCommandProps {
  wallets: ReadonlyArray<Wallet>
  onSelect: (wallet: Wallet) => void
}

const CommandInput = ({
  value,
  onValueChange,
  placeholder,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) => (
  <input
    value={value}
    onChange={(e) => onValueChange(e.target.value)}
    aria-label={placeholder ?? 'Buscar carteira'}
    placeholder={placeholder}
    className={cn(
      'w-full rounded-md border border-input bg-transparent py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
  />
)

const CommandGroup = ({
  heading,
  children,
  className,
}: {
  heading?: string
  children: React.ReactNode
  className?: string
}) => (
  <div
    role="listbox"
    aria-label={heading ?? 'Carteiras cadastradas'}
    className={cn('flex flex-col gap-0.5 p-1', className)}
  >
    {heading && (
      <div
        aria-hidden="true"
        className="px-2 py-0.5 text-xs font-medium text-muted-foreground"
      >
        {heading}
      </div>
    )}
    {children}
  </div>
)

const CommandItem = ({
  onSelect,
  children,
  className,
}: {
  onSelect: () => void
  children: React.ReactNode
  className?: string
}) => (
  <button
    type="button"
    role="option"
    aria-selected={false}
    onClick={onSelect}
    className={cn(
      'flex w-full cursor-default items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
  >
    {children}
  </button>
)

const CommandEmpty = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
    {children}
  </div>
)

export const WalletCommand = ({ wallets, onSelect }: WalletCommandProps) => {
  const [search, setSearch] = useState('')

  const results = useMemo(() => {
    if (!search) return wallets
    const query = search.toLowerCase()
    return wallets.filter(
      (wallet) =>
        wallet.label.toLowerCase().includes(query) ||
        wallet.address.toLowerCase().includes(query),
    )
  }, [wallets, search])

  return (
    <div className="relative">
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Selecionar carteira…"
        className="w-full text-sm"
      />
      {results.length > 0 ? (
        <CommandGroup heading="Carteiras cadastradas">
          {results.map((wallet) => (
            <CommandItem
              key={wallet.id}
              onSelect={() => {
                setSearch('')
                onSelect(wallet)
              }}
              className="gap-2"
            >
              <Check
                className={cn(
                  'size-4 shrink-0 text-muted-foreground',
                )}
              />
              <span className="font-medium truncate">{wallet.label}</span>
              <span className="ml-auto text-muted-foreground font-mono text-xs">
                {wallet.address}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      ) : search ? (
        <CommandEmpty>Nenhuma carteira encontrada.</CommandEmpty>
      ) : null}
    </div>
  )
}
