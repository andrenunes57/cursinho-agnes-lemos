export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p role="status" className="text-texto-suave">
      {texto}
    </p>
  )
}
