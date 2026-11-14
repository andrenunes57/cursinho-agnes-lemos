import { createClient } from '@supabase/supabase-js'
import type { Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import type { Database } from '../src/types/database.ts'

/** URL falsa da API de Arquivos no build do E2E (VITE_API_ARQUIVOS_URL, ver playwright.config.ts). */
export const URL_API_ARQUIVOS_E2E = 'https://api-arquivos.e2e.invalid/exec'
export const CONTA_E2E = 'e2e'

type Corpo = { action?: string; accessToken?: string; [k: string]: unknown }
export type ChamadaApi = { action: string; corpo: Corpo }

/**
 * SPEC §14.3: a API de Arquivos é simulada com `page.route`. O simulador faz o que o Apps Script
 * faz (§10.3), menos o Drive: valida o JWT e grava/apaga a linha em `arquivos` no stack LOCAL com
 * o JWT da própria pessoa, para a RLS decidir como em produção.
 */
export async function simularApiArquivos(page: Page): Promise<ChamadaApi[]> {
  const chamadas: ChamadaApi[] = []
  const url = process.env.E2E_SUPABASE_URL as string
  const publishable = process.env.E2E_SUPABASE_PUBLISHABLE_KEY as string

  await page.route(URL_API_ARQUIVOS_E2E, async (route) => {
    const responder = (json: unknown) =>
      route.fulfill({ status: 200, json, headers: { 'Access-Control-Allow-Origin': '*' } })

    let corpo: Corpo
    try {
      corpo = JSON.parse(route.request().postData() ?? '') as Corpo
    } catch {
      return responder({ ok: false, erro: 'REQUISICAO_INVALIDA' })
    }
    chamadas.push({ action: String(corpo.action), corpo })

    const cliente = createClient<Database>(url, publishable, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${corpo.accessToken ?? ''}` } },
    })
    const { data: usuario } = await cliente.auth.getUser(corpo.accessToken)
    if (!usuario.user) return responder({ ok: false, erro: 'TOKEN_INVALIDO' })

    if (corpo.action === 'upload') {
      const driveId = `e2e-${randomUUID()}`
      const { data, error } = await cliente
        .from('arquivos')
        .insert({
          drive_file_id: driveId,
          nome: String(corpo.nome),
          mime_type: String(corpo.mimeType),
          tamanho_bytes: Buffer.from(String(corpo.base64), 'base64').length,
          url_visualizacao: `https://drive.google.com/file/d/${driveId}/view`,
          finalidade: corpo.finalidade as 'material' | 'entrega',
          conta_armazenamento: CONTA_E2E,
        })
        .select('id, nome, mime_type, tamanho_bytes, url_visualizacao')
        .single()
      if (error) return responder({ ok: false, erro: 'SEM_PERMISSAO' })
      return responder({ ok: true, arquivo: data })
    }

    if (corpo.action === 'delete') {
      const { data, error } = await cliente.from('arquivos').delete().eq('id', String(corpo.arquivoId)).select('id')
      if (error) return responder({ ok: false, erro: error.code === '23503' ? 'EM_USO' : 'SEM_PERMISSAO' })
      if (data.length === 0) return responder({ ok: false, erro: 'NAO_ENCONTRADO' })
      return responder({ ok: true })
    }

    return responder({ ok: false, erro: 'REQUISICAO_INVALIDA' })
  })

  // O player do YouTube não precisa carregar de verdade nos testes.
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="pt-BR"><title>Vídeo</title></html>' }),
  )

  return chamadas
}
