import { expect, test, type Page } from '@playwright/test'
import { anoSP } from '../src/lib/datas.ts'
import { simularApiArquivos } from './apiArquivos.ts'
import { verificarPagina } from './axe.ts'
import { estadoDe, TURMA_MATERIAIS } from './contas.ts'

// SPEC §13 F4 / §14.3 (materiais.spec.ts): a docente cria a aula e os 4 tipos de material, todos
// nascem rascunho; publica 3; a estudante da turma vê só os publicados. A API de Arquivos é
// simulada (e2e/apiArquivos.ts). Celular e desktop rodam em paralelo no mesmo banco, por isso o
// título da aula leva o nome do projeto.

test.use({ storageState: estadoDe('prof') })

const aviso = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

/** Item (material) da lista ordenada da aula. */
const itens = (page: Page) => page.getByRole('list', { name: /Materiais da aula/ }).getByRole('listitem')

async function adicionar(page: Page, preencher: () => Promise<void>, titulo: string) {
  await page.getByRole('button', { name: 'Adicionar material' }).click()
  await preencher()
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await aviso(page, `Material ${titulo} salvo como rascunho.`)
}

test('docente monta a aula em rascunho e a estudante vê só o publicado (RF-10 a RF-13)', async ({ page, browser }, info) => {
  const projeto = info.project.name
  const tituloAula = `E2E Materiais ${projeto}`
  const chamadas = await simularApiArquivos(page)
  let urlAula = ''

  await test.step('docente cria a própria aula (RF-10)', async () => {
    await page.goto('./docente/aulas')
    await expect(page.getByRole('heading', { level: 1, name: 'Minhas aulas' })).toBeVisible()
    await page.getByRole('button', { name: 'Nova aula' }).click()
    await page.getByLabel(/Título da aula/).fill(tituloAula)
    await page.getByRole('combobox', { name: /^Turma/ }).selectOption({ label: `${TURMA_MATERIAIS} (${anoSP()})` })
    await page.getByRole('combobox', { name: /^Disciplina/ }).selectOption({ label: 'Matemática' })
    await verificarPagina(page)
    await page.getByRole('button', { name: 'Criar aula' }).click()

    await expect(page.getByRole('heading', { level: 1, name: tituloAula })).toBeVisible()
    await aviso(page, `Aula ${tituloAula} criada.`)
    await expect(page.getByRole('tab', { name: 'Materiais' })).toHaveAttribute('aria-selected', 'true')
    urlAula = page.url()
  })

  await test.step('arquivo de tipo proibido não chega à API', async () => {
    await page.getByRole('button', { name: 'Adicionar material' }).click()
    await page.getByLabel(/Arquivo para enviar/).setInputFiles({ name: 'programa.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('MZ') })
    await page.getByRole('button', { name: 'Salvar rascunho' }).click()
    await expect(page.getByText(/Tipo de arquivo não aceito/)).toBeVisible()
    await expect(page.getByLabel(/Arquivo para enviar/)).toBeFocused()
    await verificarPagina(page)
    await page.getByRole('button', { name: 'Cancelar' }).click()
    expect(chamadas).toHaveLength(0)
  })

  await test.step('os 4 tipos de material nascem como rascunho (RF-11/RF-12)', async () => {
    await adicionar(
      page,
      async () => {
        await page.getByLabel(/Arquivo para enviar/).setInputFiles({ name: 'lista-1.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 e2e') })
        await expect(page.getByLabel(/Título do material/)).toHaveValue('lista-1')
      },
      'lista-1',
    )
    expect(chamadas.map((c) => c.action)).toEqual(['upload'])
    expect(chamadas[0].corpo).toMatchObject({ finalidade: 'material', nome: 'lista-1.pdf', mimeType: 'application/pdf' })

    await adicionar(
      page,
      async () => {
        await page.getByRole('radio', { name: 'Link' }).check()
        await page.getByLabel(/Endereço do link/).fill('https://exemplo.org/leitura')
        await page.getByLabel(/Título do material/).fill('Leitura complementar')
      },
      'Leitura complementar',
    )
    await adicionar(
      page,
      async () => {
        await page.getByRole('radio', { name: 'Vídeo do YouTube' }).check()
        await page.getByLabel(/Link do vídeo/).fill('https://youtu.be/dQw4w9WgXcQ')
        await page.getByLabel(/Título do material/).fill('Videoaula')
      },
      'Videoaula',
    )
    await adicionar(
      page,
      async () => {
        await page.getByRole('radio', { name: 'Texto' }).check()
        await page.getByLabel(/Título do material/).fill('Planejamento interno')
        await page.getByLabel(/Conteúdo do texto/).fill('Revisar a lista antes. Ver https://exemplo.org/plano.')
      },
      'Planejamento interno',
    )

    await expect(itens(page)).toHaveCount(4)
    await expect(itens(page).getByText('Rascunho', { exact: true })).toHaveCount(4)
    await verificarPagina(page)
  })

  await test.step('publica 3 e reordena (RF-12)', async () => {
    for (const titulo of ['lista-1', 'Leitura complementar', 'Videoaula']) {
      await page.getByRole('button', { name: `Publicar ${titulo}` }).click()
      await aviso(page, `Material ${titulo} publicado para a turma.`)
    }
    await expect(itens(page).getByText('Publicado', { exact: true })).toHaveCount(3)

    await page.getByRole('button', { name: 'Descer lista-1' }).click()
    await aviso(page, 'Material lista-1 movido para a posição 2.')
    await expect(itens(page).nth(0)).toContainText('Leitura complementar')
    await expect(itens(page).nth(1)).toContainText('lista-1')
    await expect(page.getByRole('button', { name: 'Subir Leitura complementar' })).toBeDisabled()
  })

  await test.step('estudante da turma vê só os publicados (RF-13)', async () => {
    const contexto = await browser.newContext({ storageState: estadoDe('est') })
    const est = await contexto.newPage()
    await simularApiArquivos(est)

    await est.goto('./aulas')
    await expect(est.getByRole('heading', { level: 1, name: 'Aulas' })).toBeVisible()
    const cartao = est.getByRole('listitem').filter({ hasText: tituloAula })
    await expect(cartao).toContainText('Docente Teste (ela/dela)')
    await expect(cartao.getByText('Hoje', { exact: true })).toBeVisible()
    await verificarPagina(est)
    await cartao.getByRole('link', { name: tituloAula }).click()

    await expect(est.getByRole('heading', { level: 1, name: tituloAula })).toBeVisible()
    const materiais = est.getByRole('heading', { level: 3 })
    await expect(materiais).toHaveText(['Leitura complementar', 'lista-1', 'Videoaula'])
    await expect(est.getByText('Planejamento interno')).toHaveCount(0)
    await expect(est.getByRole('link', { name: /Abrir lista-1.pdf/ })).toHaveAttribute('href', /^https:\/\/drive\.google\.com\/file\/d\/e2e-/)
    await expect(est.locator('iframe[title="Vídeo: Videoaula"]')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    await verificarPagina(est)

    // O Início também mostra a aula de hoje.
    await est.goto('./')
    await expect(est.getByRole('region', { name: 'Aulas de hoje' }).getByRole('link', { name: tituloAula })).toBeVisible()
    await contexto.close()
  })

  await test.step('excluir material com arquivo chama o delete da API', async () => {
    await page.goto(urlAula)
    await page.getByRole('button', { name: 'Excluir lista-1' }).click()
    await page.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await aviso(page, 'Material lista-1 excluído.')
    await expect(itens(page)).toHaveCount(3)
    expect(chamadas.at(-1)).toMatchObject({ action: 'delete', corpo: { arquivoId: expect.any(String) } })
  })
})
