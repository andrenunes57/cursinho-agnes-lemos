import { Link } from 'react-router'

export function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-slate-900">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p>O endereço que você abriu não existe ou mudou de lugar.</p>
      <Link to="/" className="font-semibold text-marca underline underline-offset-4">
        Voltar para o início
      </Link>
    </main>
  )
}
