import { expect, test, type Page } from '@playwright/test'
import { semViolacoesGraves } from './axe.ts'
import { CONTAS, estadoDe } from './contas.ts'

// SPEC §13 F2 / §14.3 (acesso.spec.ts): guardas de rota, onboarding, pendente bloqueada,
// menu por papel e axe em cada página, nos dois viewports.

/** No celular, o menu completo fica atrás do botão "Menu" da barra inferior. */
async function abrirMenuSeCelular(page: Page) {
  const botaoMenu = page.getByRole('button', { name: 'Menu' })
  if (await botaoMenu.isVisible()) await botaoMenu.click()
}

const menu = (page: Page) => page.getByRole('navigation', { name: 'Menu principal' })

test.describe('sem sessão', () => {
  test('/entrar?error=… mostra mensagem amigável e limpa a URL (RF-01)', async ({ page }) => {
    await page.goto('./?error=invalid_request&error_code=bad_oauth_state&error_description=OAuth+state+expired')

    await expect(page.getByRole('alert')).toHaveText('O login demorou demais ou foi cancelado. Tente de novo.')
    await expect(page).toHaveURL(/\/entrar$/)
    await semViolacoesGraves(page)
  })

  test('rotas internas levam para /entrar', async ({ page }) => {
    await page.goto('./coordenacao/pessoas')
    await expect(page).toHaveURL(/\/entrar$/)
  })
})

test.describe('conta nova', () => {
  test('login → onboarding → aguardando → sair', async ({ browser }, info) => {
    const conta = info.project.name === 'celular' ? 'novo-celular' : 'novo-desktop'
    const contexto = await browser.newContext({ storageState: estadoDe(conta) })
    const page = await contexto.newPage()

    await page.goto('./')
    await expect(page).toHaveURL(/\/primeiro-acesso$/)
    await expect(page.getByRole('heading', { level: 1, name: /Boas-vindas/ })).toBeVisible()
    // Nada vem preenchido com dados do Google (RF-02).
    await expect(page.getByLabel(/Nome social/)).toHaveValue('')
    await semViolacoesGraves(page)

    // Erros de validação anunciados em texto.
    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Informe seu nome social.')).toBeVisible()
    await expect(page.getByLabel(/Nome social/)).toBeFocused()
    await semViolacoesGraves(page)

    await page.getByLabel(/Nome social/).fill('Pessoa Nova')
    await page.getByRole('radio', { name: 'Outro' }).check()
    await page.getByLabel(/Quais são seus pronomes/).fill('ile/dile')
    await page.getByRole('checkbox', { name: /aviso de privacidade/ }).check()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page).toHaveURL(/\/aguardando$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Cadastro recebido!' })).toBeVisible()
    await expect(page.getByText('Pessoa Nova')).toBeVisible()
    await expect(page.getByText('ile/dile')).toBeVisible()
    await expect(page.getByText(CONTAS[conta].email)).toBeVisible()
    await semViolacoesGraves(page)

    await page.getByRole('button', { name: 'Sair' }).click()
    await expect(page).toHaveURL(/\/entrar$/)
    await contexto.close()
  })
})

test.describe('pessoa pendente', () => {
  test.use({ storageState: estadoDe('pend') })

  test('só vê /aguardando, mesmo tentando outras rotas (RF-03)', async ({ page }) => {
    for (const rota of ['./', './perfil', './coordenacao/pessoas', './aulas', './primeiro-acesso']) {
      await page.goto(rota)
      await expect(page).toHaveURL(/\/aguardando$/)
    }
    await expect(page.getByRole('heading', { level: 1, name: 'Cadastro recebido!' })).toBeVisible()
    await expect(menu(page)).toHaveCount(0)
  })
})

test.describe('pessoa inativa', () => {
  test.use({ storageState: estadoDe('inativo') })

  test('vê "Acesso desativado"', async ({ page }) => {
    await page.goto('./')
    await expect(page).toHaveURL(/\/aguardando$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Acesso desativado' })).toBeVisible()
    await expect(page.getByText(/fale com a coordenação/)).toBeVisible()
    await semViolacoesGraves(page)
  })
})

test.describe('estudante ativa', () => {
  test.use({ storageState: estadoDe('est') })

  test('vê o Início e o menu de estudante, com nome social e pronomes', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1, name: 'Boas-vindas, Estudante Teste!' })).toBeVisible()
    await abrirMenuSeCelular(page)
    await expect(menu(page).getByRole('link', { name: 'Tarefas' }).first()).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Pessoas' })).toHaveCount(0)
    await expect(page.getByText('Estudante Teste (ela/dela)').first()).toBeVisible()
    await semViolacoesGraves(page)
  })

  test('papel incompatível volta para o Início', async ({ page }) => {
    await page.goto('./coordenacao/pessoas')
    await expect(page.getByRole('heading', { level: 1, name: /Boas-vindas/ })).toBeVisible()
    await page.goto('./docente/aulas')
    await expect(page.getByRole('heading', { level: 1, name: /Boas-vindas/ })).toBeVisible()
  })

  test('edita o perfil (RF-04)', async ({ page }) => {
    await page.goto('./perfil')
    await expect(page.getByRole('heading', { level: 1, name: 'Meu perfil' })).toBeVisible()
    await expect(page.getByText(CONTAS.est.email)).toBeVisible()
    await expect(page.getByLabel(/Nome social/)).toHaveValue('Estudante Teste')
    await expect(page.getByRole('radio', { name: 'ela/dela' })).toBeChecked()
    await semViolacoesGraves(page)

    // Salva os mesmos valores (idempotente: a conta é compartilhada entre os projetos).
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Perfil atualizado.' })).toBeVisible()
  })
})

test.describe('coordenação', () => {
  test.use({ storageState: estadoDe('coord') })

  test('vê o menu da coordenação e navega até Pessoas', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1, name: 'Boas-vindas, Coordenação Teste!' })).toBeVisible()
    await semViolacoesGraves(page)

    await abrirMenuSeCelular(page)
    for (const item of ['Pessoas', 'Cronograma', 'Turmas', 'Disciplinas', 'Armazenamento', 'Configurações']) {
      await expect(menu(page).getByRole('link', { name: item }).first()).toBeVisible()
    }
    await semViolacoesGraves(page)

    await menu(page).getByRole('link', { name: 'Pessoas' }).first().click()
    await expect(page).toHaveURL(/\/coordenacao\/pessoas$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Pessoas' })).toBeFocused()
  })

  test('/perfil sem violações de acessibilidade', async ({ page }) => {
    await page.goto('./perfil')
    await expect(page.getByLabel(/Nome social/)).toHaveValue('Coordenação Teste')
    await expect(page.getByRole('radio', { name: 'elu/delu' })).toBeChecked()
    await semViolacoesGraves(page)
  })
})

test.describe('docente', () => {
  test.use({ storageState: estadoDe('prof') })

  test('vê "Minhas aulas" e não vê as telas da coordenação', async ({ page }) => {
    await page.goto('./')
    await abrirMenuSeCelular(page)
    await expect(menu(page).getByRole('link', { name: 'Minhas aulas' }).first()).toBeVisible()
    await expect(menu(page).getByRole('link', { name: 'Pessoas' })).toHaveCount(0)
    await page.goto('./coordenacao/configuracoes')
    await expect(page.getByRole('heading', { level: 1, name: /Boas-vindas/ })).toBeVisible()
  })
})
