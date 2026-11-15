import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { anoSP, hojeSP, somarDias } from '../src/lib/datas.ts'
import type { Database } from '../src/types/database.ts'
import { CONTA_E2E, simularApiArquivos } from './apiArquivos.ts'
import { verificarPagina } from './axe.ts'
import { estadoDe, turmaChamada } from './contas.ts'

// SPEC §13 F6 / §14.3 (chamada.spec.ts): a docente faz a chamada e a corrige (RF-20/21); a
// estudante vê a frequência (RF-22); docente e coordenação veem o relatório (RF-23) e a
// coordenação exporta o CSV (RF-24), vê a chamada só para leitura e cuida do armazenamento (RF-25).
// Cada projeto usa a própria turma (global-setup), então os números do relatório são exatos:
// 1 aula com chamada, a `est` justificada → 0 presentes, 0,0%.

test.use({ storageState: estadoDe('prof') })

const ESTUDANTE = 'Estudante Teste (ela/dela)'

const aviso = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

async function criarAula(page: Page, titulo: string, turma: string, data?: string) {
  await page.goto('./docente/aulas')
  await page.getByRole('button', { name: 'Nova aula' }).click()
  await page.getByLabel(/Título da aula/).fill(titulo)
  await page.getByRole('combobox', { name: /^Turma/ }).selectOption({ label: `${turma} (${anoSP()})` })
  await page.getByRole('combobox', { name: /^Disciplina/ }).selectOption({ label: 'Matemática' })
  if (data) await page.getByLabel(/^Data/).fill(data)
  await page.getByRole('button', { name: 'Criar aula' }).click()
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
  return page.url().split('?')[0]
}

/** Linha da estudante no relatório: tabela no desktop, cartão em janela estreita (zoom alto, SPEC §5.3). */
async function conferirRelatorio(page: Page, projeto: string) {
  if (projeto === 'zoom') {
    const cartao = page.getByRole('listitem').filter({ hasText: ESTUDANTE })
    await expect(cartao).toHaveText(/Aulas com chamada\s*1\s*Presentes\s*0\s*Ausentes\s*0\s*Justificadas\s*1\s*Frequência\s*0,0%/)
  } else {
    await expect(page.getByRole('row', { name: new RegExp(ESTUDANTE.replace(/[()/]/g, '\\$&')) })).toHaveText(
      /\(ela\/dela\)\s*1\s*0\s*0\s*1\s*0,0%/,
    )
  }
}

test('chamada, frequência, relatórios e armazenamento (RF-20 a RF-25)', async ({ page, browser }, info) => {
  const projeto = info.project.name
  const turma = turmaChamada(projeto)
  const tituloAula = `E2E Chamada ${projeto}`
  let urlAula = ''

  await test.step('aula futura não abre a chamada', async () => {
    await criarAula(page, `E2E Chamada futura ${projeto}`, turma, somarDias(hojeSP(), 7))
    await page.getByRole('tab', { name: 'Chamada' }).click()
    await expect(page.getByText('A chamada abre no dia da aula')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salvar chamada' })).toHaveCount(0)
  })

  await test.step('docente faz a chamada: todas presentes de início, marca ausente e salva (RF-20)', async () => {
    urlAula = await criarAula(page, tituloAula, turma)
    await page.getByRole('tab', { name: 'Chamada' }).click()
    const estudante = page.getByRole('group', { name: ESTUDANTE })
    await expect(estudante.getByRole('radio', { name: 'Presente' })).toBeChecked()
    await expect(page.getByText('Presentes: 1 · Ausentes: 0 · Justificadas: 0')).toBeVisible()
    await verificarPagina(page)

    await estudante.getByRole('radio', { name: 'Ausente' }).check()
    await expect(page.getByText('Presentes: 0 · Ausentes: 1 · Justificadas: 0')).toBeVisible()
    await page.getByRole('button', { name: 'Salvar chamada' }).click()
    await aviso(page, 'Chamada salva: 1 estudante.')
    await expect(page.getByText(/^Chamada registrada\. Última alteração/)).toBeVisible()
  })

  await test.step('docente reabre e corrige para justificada (RF-21)', async () => {
    await page.goto(`${urlAula}?aba=chamada`)
    const estudante = page.getByRole('group', { name: ESTUDANTE })
    await expect(estudante.getByRole('radio', { name: 'Ausente' })).toBeChecked()
    await estudante.getByRole('radio', { name: 'Justificada' }).check()
    await page.getByRole('button', { name: 'Salvar chamada' }).click()
    await aviso(page, 'Chamada salva: 1 estudante.')
  })

  await test.step('docente vê o relatório das próprias aulas', async () => {
    await page.goto('./docente/frequencia')
    await expect(page.getByRole('heading', { level: 1, name: 'Frequência das minhas aulas' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Turma' }).selectOption({ label: `${turma} (${anoSP()})` })
    await conferirRelatorio(page, projeto)
    await expect(page.getByRole('button', { name: 'Exportar CSV' })).toHaveCount(0)
    await verificarPagina(page)

    // Digitada tecla a tecla, a data não pode se perder: o campo passa por anos como "0002" e,
    // se o React devolver o valor antigo no meio da digitação, o Chrome recomeça o ano.
    // Dia = mês porque a ordem dos segmentos segue o idioma do navegador, não o `locale`.
    const campoDe = page.getByLabel('De', { exact: true })
    const digitada = `${anoSP()}-11-11`
    await campoDe.focus() // primeiro segmento; um click no centro cairia no segundo
    await page.keyboard.type(`1111${anoSP()}`, { delay: 50 })
    await expect(campoDe).toHaveValue(digitada)
    await expect(page).toHaveURL(new RegExp(`de=${digitada}`))
    await campoDe.fill('')

    // Período sem a aula: a estudante aparece sem chamada.
    await page.getByLabel('Até', { exact: true }).fill(somarDias(hojeSP(), -1))
    await expect(page.getByText('Sem chamada').filter({ visible: true }).first()).toBeVisible()
    await page.getByLabel('De', { exact: true }).fill(hojeSP())
    await expect(page.getByText('A data final precisa ser igual ou posterior à inicial.')).toBeVisible()
  })

  await test.step('estudante vê a própria frequência (RF-22)', async () => {
    const contexto = await browser.newContext({ storageState: estadoDe('est') })
    const est = await contexto.newPage()
    await est.goto('./frequencia')
    await expect(est.getByRole('heading', { level: 1, name: 'Minha frequência' })).toBeVisible()
    const cartao = est.getByRole('region', { name: `${turma} (${anoSP()})` })
    await expect(cartao).toContainText('0,0%')
    await expect(cartao).toContainText('0 presenças em 1 aula com chamada · 0 ausências · 1 justificada')
    await expect(cartao.getByRole('listitem').filter({ hasText: tituloAula })).toContainText('Justificada')
    await verificarPagina(est)
    await contexto.close()
  })

  const contexto = await browser.newContext({ storageState: estadoDe('coord') })
  const coord = await contexto.newPage()
  await simularApiArquivos(coord)

  await test.step('coordenação vê a chamada só para leitura, sem botão (ADR-06)', async () => {
    await coord.goto(`${urlAula}?aba=chamada`)
    await expect(coord.getByRole('list', { name: 'Chamada da aula' }).getByRole('listitem').filter({ hasText: ESTUDANTE })).toContainText(
      'Justificada',
    )
    await expect(coord.getByRole('button', { name: 'Salvar chamada' })).toHaveCount(0)
    await expect(coord.getByRole('radio')).toHaveCount(0)
    await verificarPagina(coord)
  })

  await test.step('coordenação vê o relatório e exporta o CSV (RF-23, RF-24)', async () => {
    await coord.goto('./coordenacao/frequencia')
    await coord.getByRole('combobox', { name: 'Turma' }).selectOption({ label: `${turma} (${anoSP()})` })
    await conferirRelatorio(coord, projeto)
    await verificarPagina(coord)

    const download = coord.waitForEvent('download')
    await coord.getByRole('button', { name: 'Exportar CSV' }).click()
    const arquivo = await download
    expect(arquivo.suggestedFilename()).toBe(`frequencia-e2e-turma-chamada-${projeto}-todo-o-periodo.csv`)
    const csv = await readFile(await arquivo.path(), 'utf8')
    expect(csv.split('\r\n')).toEqual([
      '﻿Estudante;Pronomes;Aulas com chamada;Presentes;Ausentes;Justificadas;Frequência (%)',
      'Estudante Teste;ela/dela;1;0;0;1;0,0',
      '',
    ])
  })

  await test.step('coordenação vê o uso do Drive e exclui um arquivo órfão (RF-25)', async () => {
    const admin = createClient<Database>(process.env.E2E_SUPABASE_URL as string, process.env.E2E_SUPABASE_SECRET_KEY as string, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const driveId = `e2e-${randomUUID()}`
    const nome = `orfao-${projeto}.pdf`
    const { error } = await admin.from('arquivos').insert({
      drive_file_id: driveId,
      nome,
      mime_type: 'application/pdf',
      tamanho_bytes: 2048,
      url_visualizacao: `https://drive.google.com/file/d/${driveId}/view`,
      finalidade: 'material',
      conta_armazenamento: CONTA_E2E,
      criado_em: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    expect(error).toBeNull()

    await coord.goto('./coordenacao/armazenamento')
    await expect(coord.getByText(/13 GB de 15 GB usados \(86,7%\)/)).toBeVisible()
    await expect(coord.getByText(/o Drive passou de 80% de uso/)).toBeVisible()
    const orfaos = coord.getByRole('list', { name: 'Arquivos órfãos' })
    await expect(orfaos.getByRole('link', { name: new RegExp(nome) })).toBeVisible()
    await verificarPagina(coord)

    await coord.getByRole('button', { name: `Excluir ${nome}` }).click()
    await coord.getByRole('button', { name: 'Confirmar exclusão' }).click()
    await aviso(coord, `Arquivo ${nome} enviado para a lixeira do Drive.`)
    await expect(coord.getByRole('link', { name: new RegExp(nome) })).toHaveCount(0)
  })

  await contexto.close()
})
