import { describe, expect, it } from 'vitest'
import { perfilDeTeste } from '../test/renderizar'
import { destinoDoPerfil, nomeComPronomes } from './contexto'

describe('destinoDoPerfil (guardas 2 e 3 do §11)', () => {
  const comOnboarding = { nome_social: 'Ana', consentimento_em: '2026-11-13T10:00:00Z' }

  it('sem nome social ou sem consentimento → /primeiro-acesso', () => {
    expect(destinoDoPerfil(perfilDeTeste())).toBe('/primeiro-acesso')
    expect(destinoDoPerfil(perfilDeTeste({ nome_social: 'Ana' }))).toBe('/primeiro-acesso')
    expect(destinoDoPerfil(perfilDeTeste({ consentimento_em: '2026-11-13T10:00:00Z' }))).toBe('/primeiro-acesso')
  })

  it('pendente ou inativo → /aguardando', () => {
    expect(destinoDoPerfil(perfilDeTeste({ ...comOnboarding, status: 'pendente' }))).toBe('/aguardando')
    expect(destinoDoPerfil(perfilDeTeste({ ...comOnboarding, status: 'inativo' }))).toBe('/aguardando')
  })

  it('ativo com onboarding → acesso liberado', () => {
    expect(destinoDoPerfil(perfilDeTeste({ ...comOnboarding, status: 'ativo' }))).toBeNull()
  })
})

describe('nomeComPronomes', () => {
  it('mostra os pronomes entre parênteses só quando existem', () => {
    expect(nomeComPronomes({ nome_social: 'Ana', pronomes: 'ela/dela' })).toBe('Ana (ela/dela)')
    expect(nomeComPronomes({ nome_social: 'Ana', pronomes: null })).toBe('Ana')
  })
})
