import { expect, test, type Page } from '@playwright/test'
import { anoSP } from '../src/lib/datas.ts'
import { simularApiArquivos } from './apiArquivos.ts'
import { verificarPagina } from './axe.ts'
import { estadoDe, TURMA_MATERIAIS } from './contas.ts'

// SPEC §13 F5 / §14.3 (tarefas.spec.ts): ciclo completo nos 3 tipos de avaliação. A docente cria
// a aula e as tarefas (nota com prazo já vencido, conceito, devolutiva, e uma em rascunho); a
// estudante envia (arquivo + reenvio, link, comentário); a docente avalia; a estudante vê a
// avaliação e não consegue mais reenviar. A API de Arquivos é simulada (e2e/apiArquivos.ts).
// Celular e desktop rodam em paralelo no mesmo banco, por isso os títulos levam o nome do projeto.

test.use({ storageState: estadoDe('prof') })

const ESTUDANTE = 'Estudante Teste (ela/dela)'
/** Botão "Abrir e avaliar" + nome da pessoa em texto só para leitor de tela (o flex põe um espaço antes do ":"). */
const ABRIR_E_AVALIAR = /^Abrir e avaliar ?: Estudante Teste \(ela\/dela\)$/

const aviso = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

const pdf = (nome: string) => ({ name: nome, mimeType: 'application/pdf', buffer: Buffer.from(`%PDF-1.4 ${nome}`) })

async function criarTarefa(
  page: Page,
  { titulo, tipo, publicar = true, prazo }: { titulo: string; tipo: RegExp; publicar?: boolean; prazo?: string },
) {
  await page.getByRole('button', { name: 'Nova tarefa' }).click()
  await page.getByLabel(/Título da tarefa/).fill(titulo)
  await page.getByLabel(/Instruções/).fill(`Instruções de ${titulo}. Veja https://exemplo.org/apoio.`)
  if (prazo) await page.getByLabel(/Prazo/).fill(prazo)
  await page.getByRole('radio', { name: tipo }).check()
  if (publicar) await page.getByRole('checkbox', { name: /Publicar agora/ }).check()
  await page.getByRole('button', { name: 'Criar tarefa' }).click()
  await aviso(page, publicar ? `Tarefa ${titulo} publicada para a turma.` : `Tarefa ${titulo} salva como rascunho.`)
}

/** Abre a entrega da estudante na página de entregas da tarefa. */
async function abrirEntrega(page: Page, urlAula: string, tarefa: string) {
  await page.goto(`${urlAula}?aba=tarefas`)
  await page.getByRole('link', { name: `Ver entregas de ${tarefa}` }).click()
  await expect(page.getByRole('heading', { level: 1, name: `Entregas: ${tarefa}` })).toBeVisible()
  await page.getByRole('button', { name: ABRIR_E_AVALIAR }).click()
}

test('ciclo de tarefa nos 3 tipos de avaliação (RF-15 a RF-19)', async ({ page, browser }, info) => {
  const projeto = info.project.name
  const tituloAula = `E2E Tarefas ${projeto}`
  const tNota = `Lista ${projeto}`
  const tConceito = `Redação ${projeto}`
  const tDevolutiva = `Reflexão ${projeto}`
  const tRascunho = `Rascunho ${projeto}`
  await simularApiArquivos(page)
  let urlAula = ''

  await test.step('docente cria a aula e as tarefas (RF-15)', async () => {
    await page.goto('./docente/aulas')
    await page.getByRole('button', { name: 'Nova aula' }).click()
    await page.getByLabel(/Título da aula/).fill(tituloAula)
    await page.getByRole('combobox', { name: /^Turma/ }).selectOption({ label: `${TURMA_MATERIAIS} (${anoSP()})` })
    await page.getByRole('combobox', { name: /^Disciplina/ }).selectOption({ label: 'Português' })
    await page.getByRole('button', { name: 'Criar aula' }).click()
    await expect(page.getByRole('heading', { level: 1, name: tituloAula })).toBeVisible()
    urlAula = page.url().split('?')[0]

    await page.getByRole('tab', { name: 'Tarefas' }).click()
    await expect(page.getByText('Nenhuma tarefa nesta aula')).toBeVisible()

    // Formulário vazio: o foco vai para o título.
    await page.getByRole('button', { name: 'Nova tarefa' }).click()
    await page.getByRole('radio', { name: 'Conceito' }).check()
    await expect(page.getByLabel(/Conceitos possíveis/)).toHaveValue('Satisfatório\nPrecisa revisar')
    await verificarPagina(page)
    await page.getByRole('button', { name: 'Criar tarefa' }).click()
    await expect(page.getByLabel(/Título da tarefa/)).toBeFocused()
    await page.getByRole('button', { name: 'Cancelar' }).click()

    await criarTarefa(page, { titulo: tNota, tipo: /^Nota/, prazo: '2020-01-01T10:00' })
    await criarTarefa(page, { titulo: tConceito, tipo: /^Conceito/ })
    await criarTarefa(page, { titulo: tDevolutiva, tipo: /devolutiva/ })
    await criarTarefa(page, { titulo: tRascunho, tipo: /^Nota/, publicar: false })

    const lista = page.getByRole('list', { name: 'Tarefas da aula' }).getByRole('listitem')
    await expect(lista).toHaveCount(4)
    await expect(lista.filter({ hasText: tRascunho }).getByText('Rascunho', { exact: true })).toBeVisible()
    await expect(lista.filter({ hasText: tNota })).toContainText('(encerrado)')
    await verificarPagina(page)
  })

  const contexto = await browser.newContext({ storageState: estadoDe('est') })
  const est = await contexto.newPage()
  const chamadasEst = await simularApiArquivos(est)

  await test.step('estudante vê só as publicadas (RF-16)', async () => {
    await est.goto('./')
    await expect(est.getByRole('region', { name: 'Tarefas pendentes' }).getByRole('link', { name: tNota })).toBeVisible()

    await est.goto('./tarefas')
    await expect(est.getByRole('heading', { level: 1, name: 'Tarefas' })).toBeVisible()
    await expect(est.getByRole('tab', { name: 'Pendentes' })).toHaveAttribute('aria-selected', 'true')
    for (const t of [tNota, tConceito, tDevolutiva]) await expect(est.getByRole('link', { name: t })).toBeVisible()
    await expect(est.getByRole('link', { name: tRascunho })).toHaveCount(0)
    await verificarPagina(est)
  })

  await test.step('conceito: envia arquivo e reenvia com outro; o antigo vai para a lixeira (RF-17)', async () => {
    await est.getByRole('link', { name: tConceito }).click()
    await expect(est.getByRole('heading', { level: 1, name: tConceito })).toBeVisible()
    await expect(est.getByText('Pendente', { exact: true })).toBeVisible()
    await verificarPagina(est)

    await est.getByLabel('Arquivo', { exact: true }).setInputFiles(pdf('resposta-v1.pdf'))
    await est.getByRole('button', { name: 'Enviar entrega' }).click()
    await aviso(est, 'Entrega enviada.')
    await expect(est.getByRole('link', { name: /Abrir resposta-v1.pdf/ })).toBeVisible()
    await expect(est.getByText('Enviada', { exact: true })).toBeVisible()

    await est.getByRole('radio', { name: 'Trocar por outro arquivo' }).check()
    await est.getByLabel(/Novo arquivo/).setInputFiles(pdf('resposta-v2.pdf'))
    await est.getByRole('button', { name: 'Reenviar entrega' }).click()
    await aviso(est, 'Entrega reenviada.')
    await expect(est.getByRole('link', { name: /Abrir resposta-v2.pdf/ })).toBeVisible()
    await expect(est.getByRole('link', { name: /Abrir resposta-v1.pdf/ })).toHaveCount(0)
    expect(chamadasEst.map((c) => c.action)).toEqual(['upload', 'upload', 'delete'])
    expect(chamadasEst[0].corpo).toMatchObject({ finalidade: 'entrega', nome: 'resposta-v1.pdf' })
    await verificarPagina(est)
  })

  await test.step('nota: envia um link depois do prazo (atrasada)', async () => {
    await est.goto('./tarefas')
    await est.getByRole('link', { name: tNota }).click()
    await est.getByLabel(/^Link/).fill('https://docs.google.com/document/d/e2e')
    await est.getByRole('button', { name: 'Enviar entrega' }).click()
    await aviso(est, 'Entrega enviada.')
    await expect(est.getByText('Enviada com atraso', { exact: true })).toBeVisible()
    await expect(est.getByText('(depois do prazo)')).toBeVisible()
  })

  await test.step('devolutiva: envia só um comentário', async () => {
    await est.goto('./tarefas')
    await est.getByRole('link', { name: tDevolutiva }).click()
    await est.getByRole('button', { name: 'Enviar entrega' }).click()
    await expect(est.getByText(/pelo menos um: arquivo, link ou comentário/)).toBeVisible()
    await est.getByLabel(/^Comentário/).fill('Minha reflexão sobre o texto.')
    await est.getByRole('button', { name: 'Enviar entrega' }).click()
    await aviso(est, 'Entrega enviada.')

    await est.goto('./tarefas?aba=enviadas')
    for (const t of [tNota, tConceito, tDevolutiva]) await expect(est.getByRole('link', { name: t })).toBeVisible()
    await verificarPagina(est)
  })

  await test.step('docente vê as entregas aguardando e avalia os 3 tipos (RF-18)', async () => {
    await page.goto('./')
    const aguardando = page.getByRole('region', { name: 'Entregas aguardando avaliação' })
    for (const t of [tNota, tConceito, tDevolutiva]) await expect(aguardando.getByRole('link', { name: t })).toBeVisible()

    await abrirEntrega(page, urlAula, tConceito)
    await expect(page.getByRole('link', { name: /Abrir resposta-v2.pdf/ })).toBeVisible()
    await verificarPagina(page)
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await expect(page.getByText('Escolha um conceito.')).toBeVisible()
    await page.getByRole('radio', { name: 'Satisfatório' }).check()
    await page.getByLabel(/^Devolutiva/).fill('Bom texto, argumentação clara.')
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await aviso(page, `Avaliação de ${ESTUDANTE} salva.`)
    await expect(page.getByText('Avaliada', { exact: true }).first()).toBeVisible()

    await abrirEntrega(page, urlAula, tNota)
    await expect(page.getByText('(depois do prazo)')).toBeVisible()
    await page.getByLabel(/^Nota/).fill('11')
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await expect(page.getByText(/de 0 a 10, com/)).toBeVisible()
    await page.getByLabel(/^Nota/).fill('8,5')
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await aviso(page, `Avaliação de ${ESTUDANTE} salva.`)

    await abrirEntrega(page, urlAula, tDevolutiva)
    await expect(page.getByText('Minha reflexão sobre o texto.')).toBeVisible()
    await page.getByLabel(/^Devolutiva/).fill('Ótima reflexão.')
    await page.getByRole('button', { name: 'Salvar avaliação' }).click()
    await aviso(page, `Avaliação de ${ESTUDANTE} salva.`)
    await verificarPagina(page)
  })

  await test.step('estudante vê as avaliações e não consegue mais reenviar (RF-17, RF-19)', async () => {
    await est.goto('./tarefas?aba=avaliadas')
    for (const t of [tNota, tConceito, tDevolutiva]) await expect(est.getByRole('link', { name: t })).toBeVisible()
    await verificarPagina(est)

    await est.getByRole('link', { name: tConceito }).click()
    const avaliacao = est.getByRole('region', { name: 'Avaliação' })
    await expect(avaliacao).toContainText('Satisfatório')
    await expect(avaliacao).toContainText('Bom texto, argumentação clara.')
    await expect(est.getByText('Esta entrega já foi avaliada e não pode mais ser reenviada.')).toBeVisible()
    await expect(est.getByRole('button', { name: /Reenviar entrega/ })).toHaveCount(0)
    await verificarPagina(est)

    await est.goto('./tarefas?aba=avaliadas')
    await est.getByRole('link', { name: tNota }).click()
    await expect(est.getByRole('region', { name: 'Avaliação' })).toContainText('8,5')

    // A seção Tarefas da aula mostra a situação.
    await est.getByRole('link', { name: new RegExp(tituloAula) }).click()
    const tarefasDaAula = est.getByRole('region', { name: 'Tarefas' })
    await expect(tarefasDaAula.getByRole('listitem').filter({ hasText: tNota })).toContainText('Avaliada')
    await expect(tarefasDaAula.getByRole('link', { name: tRascunho })).toHaveCount(0)
    await contexto.close()
  })

  await test.step('docente exclui a tarefa em rascunho', async () => {
    await page.goto(`${urlAula}?aba=tarefas`)
    await page.getByRole('button', { name: `Excluir ${tRascunho}` }).click()
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await aviso(page, `Tarefa ${tRascunho} excluída.`)
    await expect(page.getByRole('list', { name: 'Tarefas da aula' }).getByRole('listitem')).toHaveCount(3)
  })
})
