import { expect, test, type Locator, type Page } from '@playwright/test'
import { anoSP } from '../src/lib/datas.ts'
import { semViolacoesGraves } from './axe.ts'
import { CONTAS, estadoDe } from './contas.ts'

// SPEC §13 F3 / §14.3 (coordenacao.spec.ts): a coordenação aprova uma estudante (com turma) e uma
// docente, cria aulas para a docente, reatribui e exclui, gerencia matrículas, turmas e
// disciplinas. Os nomes levam o projeto (celular/desktop) porque os dois rodam em paralelo no
// mesmo banco; o global-setup apaga os "E2E …" da execução anterior.

test.use({ storageState: estadoDe('coord') })

/** Aviso de sucesso da página (role=status, aria-live) com o texto. */
const aviso = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

/** Cartão (item de lista) que contém o texto. */
const cartao = (page: Page, texto: string | RegExp): Locator => page.getByRole('listitem').filter({ hasText: texto })

/** Aba (role=tab) pelo começo do rótulo, que traz a contagem: "Pendentes (3)". */
const aba = (page: Page, nome: string) => page.getByRole('tab', { name: new RegExp(`^${nome}`) })

/** axe sem violações graves + nenhuma rolagem horizontal (SPEC §5.3: layout em 320–375 px). */
async function verificar(page: Page) {
  await semViolacoesGraves(page)
  const { largura, viewport } = await page.evaluate(() => ({
    largura: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))
  expect(largura, `Rolagem horizontal em ${page.url()}`).toBeLessThanOrEqual(viewport)
}

async function abrirMenuSeCelular(page: Page) {
  const botaoMenu = page.getByRole('button', { name: 'Menu' })
  if (await botaoMenu.isVisible()) await botaoMenu.click()
}

test('ciclo da coordenação: disciplina, turma, aprovação, cronograma e matrículas', async ({ page, browser }, info) => {
  const projeto = info.project.name as 'celular' | 'desktop'
  const est = CONTAS[`aprovar-est-${projeto}`]
  const prof = CONTAS[`aprovar-prof-${projeto}`]
  const disciplina = `E2E Disciplina ${projeto}`
  const turma = `E2E Turma ${projeto}`
  const rotuloTurma = `${turma} (${anoSP()})`
  const aulaA = `E2E Aula A ${projeto}`
  const aulaB = `E2E Aula B ${projeto}`

  await test.step('disciplinas: criar, desativar e reativar (RF-08)', async () => {
    await page.goto('./coordenacao/disciplinas')
    await expect(page.getByRole('heading', { level: 1, name: 'Disciplinas' })).toBeVisible()

    await page.getByRole('button', { name: 'Nova disciplina' }).click()
    // Erro anunciado em texto e foco no campo.
    await page.getByRole('button', { name: 'Criar disciplina' }).click()
    await expect(page.getByLabel(/Nome da disciplina/)).toBeFocused()
    await expect(page.getByText('Informe o nome da disciplina.')).toBeVisible()
    await verificar(page)

    await page.getByLabel(/Nome da disciplina/).fill(disciplina)
    await page.getByRole('button', { name: 'Criar disciplina' }).click()
    await aviso(page, `Disciplina ${disciplina} criada.`)

    const card = cartao(page, disciplina)
    await card.getByRole('button', { name: `Desativar ${disciplina}` }).click()
    await expect(card.getByText('Inativa', { exact: true })).toBeVisible()
    await card.getByRole('button', { name: `Ativar ${disciplina}` }).click()
    await expect(card.getByText('Ativa', { exact: true })).toBeVisible()

    // Nome repetido: mensagem amigável (UNIQUE do banco).
    await page.getByRole('button', { name: 'Nova disciplina' }).click()
    await page.getByLabel(/Nome da disciplina/).fill(disciplina)
    await page.getByRole('button', { name: 'Criar disciplina' }).click()
    await expect(page.getByRole('alert')).toHaveText('Já existe uma disciplina com esse nome.')
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await verificar(page)
  })

  await test.step('turmas: criar (RF-07)', async () => {
    await page.goto('./coordenacao/turmas')
    await page.getByRole('button', { name: 'Nova turma' }).click()
    await page.getByLabel(/Nome da turma/).fill(turma)
    await expect(page.getByLabel(/^Ano/)).toHaveValue(String(anoSP()))
    await verificar(page)
    await page.getByRole('button', { name: 'Criar turma' }).click()
    await aviso(page, `Turma ${turma} criada.`)
    await expect(cartao(page, turma).getByRole('heading', { name: turma })).toBeVisible()
  })

  await test.step('pessoas: aprovar estudante com turma e docente (RF-05)', async () => {
    await page.goto('./coordenacao/pessoas')
    await expect(aba(page, 'Pendentes')).toHaveAttribute('aria-selected', 'true')
    await verificar(page)

    // Sem seleção: erro em texto, nada é enviado.
    await page.getByRole('button', { name: /^Aprovar \(0\)/ }).click()
    await expect(page.getByText('Selecione pelo menos uma pessoa.')).toBeVisible()

    await page.getByRole('checkbox', { name: new RegExp(est.email) }).check()
    await page.getByRole('radio', { name: 'Estudante' }).check()
    await page.getByRole('combobox', { name: 'Turma' }).selectOption({ label: rotuloTurma })
    await page.getByRole('button', { name: 'Aprovar (1)' }).click()
    await aviso(page, '1 cadastro aprovado.')
    await expect(page.getByRole('checkbox', { name: new RegExp(est.email) })).toHaveCount(0)

    await page.getByRole('checkbox', { name: new RegExp(prof.email) }).check()
    await page.getByRole('radio', { name: 'Docente' }).check()
    await expect(page.getByRole('combobox', { name: 'Turma' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Aprovar (1)' }).click()
    await expect(page.getByRole('checkbox', { name: new RegExp(prof.email) })).toHaveCount(0)

    await aba(page, 'Ativas').click()
    await expect(aba(page, 'Ativas')).toHaveAttribute('aria-selected', 'true')
    await expect(cartao(page, est.email)).toContainText(`Turmas: ${turma}`)
    await expect(cartao(page, est.email)).toContainText('Estudante')
    await expect(cartao(page, prof.email)).toContainText('Docente')
    // A própria conta não tem ações de papel/status.
    await expect(cartao(page, CONTAS.coord.email)).toContainText('Esta é a sua conta.')
    await verificar(page)
  })

  await test.step('pessoas: desativar e reativar (RF-06)', async () => {
    const card = cartao(page, est.email)
    await card.getByRole('button', { name: `Desativar ${est.nome_social}` }).click()
    await expect(card.getByText(/perde o acesso/)).toBeVisible()
    await verificar(page)
    await card.getByRole('button', { name: 'Confirmar desativação' }).click()
    await aviso(page, `Cadastro de ${est.nome_social} desativado.`)

    await aba(page, 'Inativas').click()
    await cartao(page, est.email).getByRole('button', { name: `Reativar ${est.nome_social}` }).click()
    await aviso(page, `Cadastro de ${est.nome_social} reativado.`)
  })

  await test.step('cronograma: criar aulas para a docente, reatribuir e excluir (RF-09)', async () => {
    await page.goto('./coordenacao/aulas')
    await expect(page.getByRole('heading', { level: 1, name: 'Cronograma de aulas' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Turma' }).first().selectOption({ label: rotuloTurma })
    await expect(page.getByText('Nenhuma aula nesta semana')).toBeVisible()

    for (const titulo of [aulaA, aulaB]) {
      await page.getByRole('button', { name: 'Nova aula' }).click()
      const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Criar aula' }) })
      await form.getByLabel(/Título da aula/).fill(titulo)
      await form.getByRole('combobox', { name: /^Disciplina/ }).selectOption({ label: disciplina })
      await form.getByRole('combobox', { name: /^Docente/ }).selectOption({ label: prof.nome_social })
      await expect(form.getByRole('combobox', { name: /^Turma/ })).toHaveValue(/.+/)
      if (titulo === aulaA) await verificar(page)
      await form.getByRole('button', { name: 'Criar aula' }).click()
      await aviso(page, `Aula ${titulo} criada.`)
    }

    const cardA = cartao(page, aulaA)
    await expect(cardA).toContainText(prof.nome_social)
    await expect(cardA).toContainText(disciplina)
    await expect(cardA.getByText('Sem chamada')).toBeVisible()

    // Reatribuir a aula B para outra docente.
    const cardB = cartao(page, aulaB)
    await cardB.getByRole('button', { name: `Editar ${aulaB}` }).click()
    await cardB.getByRole('combobox', { name: /^Docente/ }).selectOption({ label: 'Docente Teste (ela/dela)' })
    await cardB.getByRole('button', { name: 'Salvar aula' }).click()
    await aviso(page, `Aula ${aulaB} atualizada.`)
    await expect(cardB).toContainText('Docente Teste (ela/dela)')

    // Excluir com confirmação inline.
    await cardB.getByRole('button', { name: `Excluir ${aulaB}` }).click()
    await expect(cardB.getByRole('button', { name: 'Confirmar exclusão' })).toBeFocused()
    await verificar(page)
    await cardB.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await aviso(page, `Aula ${aulaB} excluída.`)
    await expect(page.getByRole('heading', { name: aulaB })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: aulaA })).toBeVisible()
  })

  await test.step('turmas: desmatricular e matricular de novo (RF-07)', async () => {
    await page.goto('./coordenacao/turmas')
    const card = cartao(page, turma).first()
    await card.getByRole('button', { name: `Estudantes de ${turma}` }).click()
    await expect(card.getByText(est.nome_social).first()).toBeVisible()
    await verificar(page)

    await card.getByRole('button', { name: `Desmatricular ${est.nome_social}` }).click()
    await aviso(page, `Matrícula removida de ${turma}.`)
    await card.getByRole('combobox', { name: 'Matricular estudante' }).selectOption({ label: est.nome_social })
    await card.getByRole('button', { name: 'Matricular', exact: true }).click()
    await aviso(page, `Matrícula registrada em ${turma}.`)
    await expect(card.getByRole('button', { name: `Desmatricular ${est.nome_social}` })).toBeVisible()
  })

  await test.step('início: contadores da coordenação', async () => {
    await page.goto('./')
    await expect(page.getByRole('heading', { name: 'Cadastros aguardando aprovação' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Aulas desta semana sem chamada' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ver cadastros pendentes' })).toBeVisible()
    await verificar(page)
  })

  await test.step('as contas aprovadas entram no sistema', async () => {
    for (const [conta, item] of [
      [`aprovar-prof-${projeto}`, 'Minhas aulas'],
      [`aprovar-est-${projeto}`, 'Tarefas'],
    ] as const) {
      const contexto = await browser.newContext({ storageState: estadoDe(conta) })
      const outra = await contexto.newPage()
      await outra.goto('./')
      await expect(outra.getByRole('heading', { level: 1, name: `Boas-vindas, ${CONTAS[conta].nome_social}!` })).toBeVisible()
      await abrirMenuSeCelular(outra)
      await expect(outra.getByRole('navigation', { name: 'Menu principal' }).getByRole('link', { name: item }).first()).toBeVisible()
      await contexto.close()
    }
  })
})
