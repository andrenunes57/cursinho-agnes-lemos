import type { ReactNode } from 'react'

type Tom = 'neutro' | 'sucesso' | 'alerta' | 'marca'

const estilos: Record<Tom, string> = {
  neutro: 'border-borda-forte text-texto-suave',
  sucesso: 'border-sucesso bg-sucesso-fundo text-sucesso',
  alerta: 'border-erro bg-erro-fundo text-erro',
  marca: 'border-marca bg-marca-clara text-marca',
}

/** Selo curto de situação. A informação está no texto, nunca só na cor (SPEC §5.3). */
export function Etiqueta({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-medium ${estilos[tom]}`}>
      {children}
    </span>
  )
}
