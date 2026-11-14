import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './contexto'

/**
 * Coordenação que também dá aula vê "Minhas aulas" no menu (SPEC §11).
 * Só consulta para a coordenação; para docentes o item já existe pelo papel.
 */
export function useLecionaAlgumaAula(): boolean {
  const { perfil } = useAuth()
  const ehCoordenacao = perfil?.papel === 'coordenacao'

  const { data } = useQuery({
    queryKey: ['leciona-alguma-aula', perfil?.id],
    enabled: ehCoordenacao,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('aulas')
        .select('id', { count: 'exact', head: true })
        .eq('professor_id', perfil?.id as string)
      if (error) throw error
      return (count ?? 0) > 0
    },
  })

  return ehCoordenacao && data === true
}
