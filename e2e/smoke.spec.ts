import { expect, test } from '@playwright/test'
import { semViolacoesGraves } from './axe.ts'

// Páginas públicas, sem sessão.

test('sem sessão, o Início leva para /entrar com o botão do Google', async ({ page }) => {
  await page.goto('./')

  await expect(page).toHaveURL(/\/entrar$/)
  await expect(page).toHaveTitle('Cursinho Agnes Lemos')
  await expect(page.getByRole('heading', { level: 1, name: /Agnes Lemos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  await semViolacoesGraves(page)
})

test('/privacidade é pública e acessível', async ({ page }) => {
  await page.goto('./privacidade')

  await expect(page.getByRole('heading', { level: 1, name: 'Aviso de privacidade' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Como pedir a exclusão ou tirar dúvidas' })).toBeVisible()
  await semViolacoesGraves(page)
})

test('rota inexistente mostra "Página não encontrada" (fallback de SPA)', async ({ page }) => {
  await page.goto('./rota-que-nao-existe')

  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
  await semViolacoesGraves(page)
})
