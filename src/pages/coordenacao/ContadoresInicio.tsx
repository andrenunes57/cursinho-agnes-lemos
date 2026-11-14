import { Link } from 'react-router'
import { Card } from '../../components/ui/Card'
import { Carregando } from '../../components/ui/Carregando'
import { ErroComRetry } from '../../components/ui/ErroComRetry'
import { useContadores } from './consultas'

function Contador({ titulo, valor, link, textoLink }: { titulo: string; valor: number; link: string; textoLink: string }) {
  return (
    <Card className="flex flex-col gap-2">
      <h2 className="font-semibold">{titulo}</h2>
      <p className="text-4xl font-bold text-marca">{valor}</p>
      <Link to={link} className="min-h-11 content-center font-semibold text-marca underline underline-offset-4">
        {textoLink}
      </Link>
    </Card>
  )
}

/** Início da coordenação: cadastros pendentes e aulas da semana sem chamada (SPEC §11). */
export function ContadoresInicio() {
  const contadores = useContadores()

  if (contadores.isPending) return <Carregando texto="Carregando resumo…" />
  if (contadores.isError) {
    return <ErroComRetry mensagem="Não foi possível carregar o resumo." onTentarDeNovo={() => void contadores.refetch()} />
  }

  return (
    <div className="grid grid-cols-1 gap-4 largo:grid-cols-2">
      <Contador
        titulo="Cadastros aguardando aprovação"
        valor={contadores.data.pendentes}
        link="/coordenacao/pessoas?aba=pendentes"
        textoLink="Ver cadastros pendentes"
      />
      <Contador
        titulo="Aulas desta semana sem chamada"
        valor={contadores.data.semChamada}
        link="/coordenacao/aulas"
        textoLink="Ver o cronograma"
      />
    </div>
  )
}
