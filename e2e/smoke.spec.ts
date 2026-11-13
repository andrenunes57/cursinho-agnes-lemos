import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// SPEC §14.3: tags WCAG 2.0/2.1 A e AA; nenhuma violação serious/critical.
async function violacoesGraves(page: import('@playwright/test').Page) {
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  return resultado.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
}

test('página inicial carrega com título e botão de login acessíveis', async ({ page }) => {
  await page.goto('./')

  await expect(page).toHaveTitle('Cursinho Agnes Lemos')
  await expect(page.getByRole('heading', { level: 1, name: /Agnes Lemos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  expect(await violacoesGraves(page)).toEqual([])
})

test('rota inexistente mostra "Página não encontrada" (fallback de SPA)', async ({ page }) => {
  await page.goto('./rota-que-nao-existe')

  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
  expect(await violacoesGraves(page)).toEqual([])
})
