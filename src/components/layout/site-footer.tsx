/**
 * Footer for the app shell.
 *
 * Only in-scope destinations are links; editorial/support pages are explicitly
 * out of the delivery, so they are shown as non-interactive text instead of
 * pretending to work.
 */
export const SiteFooter = () => (
  <footer className="mt-16 border-t bg-muted/30">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
      <p>NFT Market — projeto de demonstração. Nenhuma transação real é executada.</p>
      <p className="text-xs">
        Dados simulados via MSW · pagamentos, carteiras e blockchain simulados
      </p>
    </div>
  </footer>
)
