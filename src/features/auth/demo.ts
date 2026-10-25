/**
 * Fictional accounts used by the mocked API and displayed on the login screen
 * (docs/PLAN.md → Seção 4, "credenciais fictícias documentadas").
 *
 * They are demo data, not a secret: the fixtures store only a digest of the
 * password, and the values are documented in the README so anyone running the
 * app can sign in. Keeping them here gives the UI, the fixtures and the tests a
 * single source of truth.
 */
export interface DemoAccount {
  id: string
  name: string
  email: string
  password: string
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  {
    id: 'user_ava',
    name: 'Ava Duarte',
    email: 'ava@kurio.demo',
    password: 'demo1234',
  },
  {
    id: 'user_noah',
    name: 'Noah Maren',
    email: 'noah@kurio.demo',
    password: 'demo1234',
  },
] as const
