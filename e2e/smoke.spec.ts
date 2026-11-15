import { expect, test } from '@playwright/test'
import { verificarPagina } from './axe.ts'

// Páginas públicas, sem sessão.

test('sem sessão, o Início leva para /entrar com o botão do Google', async ({ page }) => {
  await page.goto('./')

  await expect(page).toHaveURL(/\/entrar$/)
  await expect(page).toHaveTitle('Cursinho Agnes Lemos')
  await expect(page.getByRole('heading', { level: 1, name: /Agnes Lemos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible()
  await verificarPagina(page)
})

test('/privacidade é pública e acessível', async ({ page }) => {
  await page.goto('./privacidade')

  await expect(page.getByRole('heading', { level: 1, name: 'Aviso de privacidade' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Como pedir a exclusão ou tirar dúvidas' })).toBeVisible()
  await verificarPagina(page)
})

test('rota inexistente mostra "Página não encontrada" (fallback de SPA)', async ({ page }) => {
  await page.goto('./rota-que-nao-existe')

  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
  await verificarPagina(page)
})

test('o app é instalável: manifest com escopo da base e ícones 192/512 (RF-28)', async ({ page, request }) => {
  await page.goto('./entrar')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBe('/cursinho-agnes-lemos/manifest.webmanifest')

  const urlManifest = new URL(href as string, page.url())
  const resposta = await request.get(urlManifest.href)
  expect(resposta.ok()).toBe(true)
  const manifest = (await resposta.json()) as {
    name: string
    display: string
    start_url: string
    scope: string
    icons: { src: string; sizes: string; purpose: string }[]
  }
  expect(manifest).toMatchObject({ display: 'standalone', start_url: './', scope: './' })
  expect(new URL(manifest.start_url, urlManifest).pathname).toBe('/cursinho-agnes-lemos/')
  expect(manifest.icons.map((i) => `${i.sizes}:${i.purpose}`)).toEqual(['192x192:any', '512x512:any', '512x512:maskable'])

  for (const icone of [...manifest.icons.map((i) => i.src), 'apple-touch-icon.png']) {
    const png = await request.get(new URL(icone, urlManifest).href)
    expect(png.ok(), icone).toBe(true)
    expect(png.headers()['content-type']).toBe('image/png')
  }
})
