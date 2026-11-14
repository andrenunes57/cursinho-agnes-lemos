/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** Fallback da URL /exec da API de Arquivos quando `configuracoes.api_arquivos.url` está vazia (SPEC §10.6). */
  readonly VITE_API_ARQUIVOS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
