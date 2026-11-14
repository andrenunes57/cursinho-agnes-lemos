import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...resto }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-xl border border-borda bg-superficie p-4 shadow-sm ${className}`} {...resto} />
}
