import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import type { Database } from '../src/types/database.ts'
import { anoSP } from '../src/lib/datas.ts'
import { CONTA_E2E } from './apiArquivos.ts'
import { CONTAS, estadoDe, TURMA_MATERIAIS, type NomeConta } from './contas.ts'

/**
 * SPEC §14.3: cria/atualiza as contas de teste no stack LOCAL pela Admin API (secret key local),
 * define papel e status e salva um storageState por conta, com a sessão injetada no localStorage.
 */
export default async function globalSetup() {
  const url = process.env.E2E_SUPABASE_URL as string
  const publishable = process.env.E2E_SUPABASE_PUBLISHABLE_KEY as string
  const secret = process.env.E2E_SUPABASE_SECRET_KEY as string
  const origem = process.env.E2E_ORIGEM as string

  const admin = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const senha = `${randomBytes(24).toString('base64url')}Aa1!`

  const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (erroLista) throw erroLista
  const existentes = new Map(lista.users.map((u) => [u.email, u.id]))

  await mkdir('e2e/.auth', { recursive: true })
  const ids = new Map<NomeConta, string>()

  // Restos do coordenacao.spec.ts de execuções anteriores. Excluir a turma leva junto, em
  // cascata, as aulas e as matrículas; só depois as disciplinas ficam livres (FK restrict).
  for (const tabela of ['turmas', 'disciplinas'] as const) {
    const { error } = await admin.from(tabela).delete().like('nome', 'E2E %')
    if (error) throw error
  }
  // Arquivos gravados pelo simulador da API (e2e/apiArquivos.ts); os materiais que os usavam
  // saíram em cascata com as turmas acima.
  {
    const { error } = await admin.from('arquivos').delete().eq('conta_armazenamento', CONTA_E2E)
    if (error) throw error
  }

  for (const [nome, conta] of Object.entries(CONTAS) as [NomeConta, (typeof CONTAS)[NomeConta]][]) {
    let id = existentes.get(conta.email)

    // Contas cujo estado o teste muda (onboarding, aprovação) começam do zero a cada execução.
    if (id && 'recriar' in conta && conta.recriar) {
      // Aula sob responsabilidade da pessoa bloqueia a exclusão (FK restrict, SPEC §8.4).
      const { error: erroAulas } = await admin.from('aulas').delete().eq('professor_id', id)
      if (erroAulas) throw erroAulas
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) throw error
      id = undefined
    }

    if (id) {
      const { error } = await admin.auth.admin.updateUserById(id, { password: senha })
      if (error) throw error
    } else {
      const { data, error } = await admin.auth.admin.createUser({ email: conta.email, password: senha, email_confirm: true })
      if (error) throw error
      id = data.user.id
    }

    const { error: erroPerfil } = await admin
      .from('perfis')
      .update({
        nome_social: conta.nome_social,
        pronomes: conta.pronomes,
        papel: conta.papel,
        status: conta.status,
        consentimento_em: conta.nome_social ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (erroPerfil) throw erroPerfil

    // Login no Node guardando a sessão num storage em memória; a mesma chave
    // (sb-<host>-auth-token) é a que o app usa no navegador, pois a URL é a mesma.
    const memoria = new Map<string, string>()
    const storage: SupportedStorage = {
      getItem: (k) => memoria.get(k) ?? null,
      setItem: (k, v) => void memoria.set(k, v),
      removeItem: (k) => void memoria.delete(k),
    }
    const cliente = createClient<Database>(url, publishable, {
      auth: { storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { error: erroLogin } = await cliente.auth.signInWithPassword({ email: conta.email, password: senha })
    if (erroLogin) throw new Error(`Login de ${conta.email} falhou: ${erroLogin.message}`)

    const estado = {
      cookies: [],
      origins: [{ origin: origem, localStorage: [...memoria].map(([name, value]) => ({ name, value })) }],
    }
    await writeFile(estadoDe(nome), JSON.stringify(estado, null, 2))
    ids.set(nome, id)
  }

  // materiais.spec.ts: turma onde a `prof` cria aulas e a `est` está matriculada.
  const { data: turma, error: erroTurma } = await admin
    .from('turmas')
    .insert({ nome: TURMA_MATERIAIS, ano: anoSP() })
    .select('id')
    .single()
  if (erroTurma) throw erroTurma
  const { error: erroMatricula } = await admin
    .from('matriculas')
    .insert({ turma_id: turma.id, estudante_id: ids.get('est') as string })
  if (erroMatricula) throw erroMatricula
}
