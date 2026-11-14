import { defineConfig, devices } from '@playwright/test'
import { execSync } from 'node:child_process'
import { URL_API_ARQUIVOS_E2E } from './e2e/apiArquivos.ts'

// SPEC §14.3: E2E contra o stack LOCAL do Supabase (`npm run db:start` antes), nos viewports de
// celular (375×667) e desktop (1280×800). O app é o build de produção servido pelo `vite preview`,
// mas com a URL e a chave publishable do stack local (variáveis do processo têm prioridade sobre
// o `.env.production` no build do Vite).
const baseURL = 'http://localhost:4173/cursinho-agnes-lemos/'

/** Lê `supabase status -o env` uma vez, ao carregar a configuração. */
function lerStackLocal() {
  let saida: string
  try {
    saida = execSync('npx supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch {
    throw new Error('Stack local do Supabase fora do ar. Rode `npm run db:start` antes de `npm run test:e2e`.')
  }
  const variaveis = new Map<string, string>()
  for (const linha of saida.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(linha.trim())
    if (m) variaveis.set(m[1], m[2])
  }
  const url = variaveis.get('API_URL')
  const publishable = variaveis.get('PUBLISHABLE_KEY')
  const secret = variaveis.get('SECRET_KEY')
  if (!url || !publishable || !secret) throw new Error('`supabase status` não trouxe API_URL/PUBLISHABLE_KEY/SECRET_KEY.')
  if (!/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url)) {
    throw new Error(`Os testes E2E só rodam contra o stack local, e a URL é ${url}.`)
  }
  return { url, publishable, secret }
}

const stack = lerStackLocal()

// Repassadas ao global-setup e aos workers. A secret key LOCAL só é usada no Node (SPEC §5.6).
process.env.E2E_SUPABASE_URL = stack.url
process.env.E2E_SUPABASE_PUBLISHABLE_KEY = stack.publishable
process.env.E2E_SUPABASE_SECRET_KEY = stack.secret
process.env.E2E_ORIGEM = new URL(baseURL).origin

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'celular',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: baseURL,
    timeout: 180_000,
    // Sempre um build novo: um preview já aberto poderia estar apontando para a nuvem.
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: stack.url,
      VITE_SUPABASE_PUBLISHABLE_KEY: stack.publishable,
      // A API de Arquivos é simulada com page.route (SPEC §14.3, e2e/apiArquivos.ts).
      VITE_API_ARQUIVOS_URL: URL_API_ARQUIVOS_E2E,
    },
  },
})
