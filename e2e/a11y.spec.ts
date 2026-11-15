import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { simularApiArquivos } from './apiArquivos.ts'
import { verificarPagina } from './axe.ts'
import {
  CONTAS,
  estadoDe,
  FIXTURES_A11Y,
  TITULO_AULA_A11Y,
  TITULO_TAREFA_A11Y,
  type FixturesA11y,
  type NomeConta,
} from './contas.ts'

// SPEC §13 F7 / §14.3 (a11y.spec.ts): fumaça por papel. Cada rota de §11 é aberta com a conta do
// papel e precisa mostrar o <h1> esperado, passar no axe (WCAG 2.0/2.1 A e AA, 0 serious/critical)
// e não ter rolagem horizontal (o projeto "celular" roda em 375×667). As rotas com `:id` usam a
// aula e a tarefa criadas pelo global-setup (TURMA_A11Y). As rotas públicas ficam no smoke.spec.ts
// e /primeiro-acesso no acesso.spec.ts, que é dono das contas novas.

type Rota = { caminho: string | ((f: FixturesA11y) => string); h1: string | RegExp }

/** Lido na hora do teste: o arquivo só existe depois do global-setup. */
const fixtures = (): FixturesA11y => JSON.parse(readFileSync(FIXTURES_A11Y, 'utf8')) as FixturesA11y

const nomeDe = (conta: NomeConta) => CONTAS[conta].nome_social as string

const ROTAS: Record<string, { conta: NomeConta; rotas: Rota[] }> = {
  pendente: { conta: 'pend', rotas: [{ caminho: './aguardando', h1: 'Cadastro recebido!' }] },
  inativa: { conta: 'inativo', rotas: [{ caminho: './aguardando', h1: 'Acesso desativado' }] },
  estudante: {
    conta: 'est',
    rotas: [
      { caminho: './', h1: `Boas-vindas, ${nomeDe('est')}!` },
      { caminho: './perfil', h1: 'Meu perfil' },
      { caminho: './aulas', h1: 'Aulas' },
      { caminho: (f) => `./aulas/${f.aulaId}`, h1: TITULO_AULA_A11Y },
      { caminho: './tarefas', h1: 'Tarefas' },
      { caminho: './tarefas?aba=enviadas', h1: 'Tarefas' },
      { caminho: './tarefas?aba=avaliadas', h1: 'Tarefas' },
      { caminho: (f) => `./tarefas/${f.tarefaId}`, h1: TITULO_TAREFA_A11Y },
      { caminho: './frequencia', h1: 'Minha frequência' },
    ],
  },
  docente: {
    conta: 'prof',
    rotas: [
      { caminho: './', h1: `Boas-vindas, ${nomeDe('prof')}!` },
      { caminho: './perfil', h1: 'Meu perfil' },
      { caminho: './docente/aulas', h1: 'Minhas aulas' },
      { caminho: (f) => `./docente/aulas/${f.aulaId}`, h1: TITULO_AULA_A11Y },
      { caminho: (f) => `./docente/aulas/${f.aulaId}?aba=tarefas`, h1: TITULO_AULA_A11Y },
      { caminho: (f) => `./docente/aulas/${f.aulaId}?aba=chamada`, h1: TITULO_AULA_A11Y },
      { caminho: (f) => `./docente/tarefas/${f.tarefaId}/entregas`, h1: `Entregas: ${TITULO_TAREFA_A11Y}` },
      { caminho: './docente/frequencia', h1: 'Frequência das minhas aulas' },
    ],
  },
  coordenação: {
    conta: 'coord',
    rotas: [
      { caminho: './', h1: `Boas-vindas, ${nomeDe('coord')}!` },
      { caminho: './perfil', h1: 'Meu perfil' },
      { caminho: './coordenacao/pessoas', h1: 'Pessoas' },
      { caminho: './coordenacao/pessoas?aba=ativas', h1: 'Pessoas' },
      { caminho: './coordenacao/pessoas?aba=inativas', h1: 'Pessoas' },
      { caminho: './coordenacao/turmas', h1: 'Turmas' },
      { caminho: './coordenacao/disciplinas', h1: 'Disciplinas' },
      { caminho: './coordenacao/aulas', h1: 'Cronograma de aulas' },
      { caminho: './coordenacao/frequencia', h1: 'Frequência' },
      { caminho: './coordenacao/armazenamento', h1: 'Armazenamento' },
      { caminho: './coordenacao/configuracoes', h1: 'Configurações' },
      // Coordenação vê a aula de outra pessoa só para leitura (SPEC §11).
      { caminho: (f) => `./docente/aulas/${f.aulaId}?aba=chamada`, h1: TITULO_AULA_A11Y },
    ],
  },
}

async function abrir(page: Page, rota: Rota) {
  const caminho = typeof rota.caminho === 'string' ? rota.caminho : rota.caminho(fixtures())
  await page.goto(caminho)
  await expect(page.getByRole('heading', { level: 1, name: rota.h1 })).toBeVisible()
  // Espera as consultas da página terminarem (skeletons e "Carregando…" fora da tela).
  await expect(page.getByText(/Carregando/)).toHaveCount(0)
  await verificarPagina(page)
}

for (const [papel, { conta, rotas }] of Object.entries(ROTAS)) {
  test.describe(papel, () => {
    test.use({ storageState: estadoDe(conta) })

    for (const rota of rotas) {
      const nome = typeof rota.caminho === 'string' ? rota.caminho : rota.caminho({ aulaId: ':aula', tarefaId: ':tarefa' })
      test(`${nome} — h1, axe e sem rolagem horizontal`, async ({ page }) => {
        // O Armazenamento chama a ação `status` da API de Arquivos.
        await simularApiArquivos(page)
        await abrir(page, rota)
      })
    }
  })
}
