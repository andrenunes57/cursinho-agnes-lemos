import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** SPEC §14.3: tags WCAG 2.0/2.1 A e AA; nenhuma violação serious/critical. */
export async function semViolacoesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const graves = resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, impacto: v.impact, alvos: v.nodes.map((n) => n.target.join(' ')) }))
  expect(graves, `Violações de acessibilidade em ${page.url()}`).toEqual([])
}
