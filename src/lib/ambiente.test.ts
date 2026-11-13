import { describe, expect, it } from 'vitest'
import { lerAmbiente } from './ambiente'

describe('lerAmbiente', () => {
  const valido = {
    VITE_SUPABASE_URL: 'https://exemplo.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc123',
  }

  it('retorna URL e chave pública quando estão presentes', () => {
    expect(lerAmbiente(valido)).toEqual({
      supabaseUrl: 'https://exemplo.supabase.co',
      supabaseChavePublica: 'sb_publishable_abc123',
    })
  })

  it('falha com mensagem clara quando a URL falta', () => {
    expect(() => lerAmbiente({ ...valido, VITE_SUPABASE_URL: '' })).toThrow('VITE_SUPABASE_URL')
  })

  it('falha quando a URL não é http(s)', () => {
    expect(() => lerAmbiente({ ...valido, VITE_SUPABASE_URL: 'exemplo.supabase.co' })).toThrow('http')
  })

  it('falha quando a chave pública falta', () => {
    expect(() => lerAmbiente({ VITE_SUPABASE_URL: valido.VITE_SUPABASE_URL })).toThrow(
      'VITE_SUPABASE_PUBLISHABLE_KEY',
    )
  })

  it('recusa a chave secreta no front-end', () => {
    expect(() => lerAmbiente({ ...valido, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_xyz' })).toThrow('secreta')
  })
})
