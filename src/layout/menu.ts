import type { Enums } from '../types/database'

export type NomeIcone =
  | 'inicio'
  | 'aulas'
  | 'tarefas'
  | 'frequencia'
  | 'pessoas'
  | 'turmas'
  | 'disciplinas'
  | 'cronograma'
  | 'armazenamento'
  | 'configuracoes'
  | 'minhas-aulas'
  | 'perfil'

export type ItemMenu = { rota: string; rotulo: string; icone: NomeIcone }

const INICIO: ItemMenu = { rota: '/', rotulo: 'Início', icone: 'inicio' }
const MINHAS_AULAS: ItemMenu = { rota: '/docente/aulas', rotulo: 'Minhas aulas', icone: 'minhas-aulas' }

/**
 * Seções do menu conforme o papel (SPEC §11). A ordem importa: no celular, os 4 primeiros
 * itens ficam na barra inferior e o resto vai para "Menu".
 * Coordenação vê "Minhas aulas" só se for docente de alguma aula.
 */
export function itensDoMenu(papel: Enums<'papel_usuario'>, lecionaAlguma: boolean): ItemMenu[] {
  switch (papel) {
    case 'estudante':
      return [
        INICIO,
        { rota: '/aulas', rotulo: 'Aulas', icone: 'aulas' },
        { rota: '/tarefas', rotulo: 'Tarefas', icone: 'tarefas' },
        { rota: '/frequencia', rotulo: 'Frequência', icone: 'frequencia' },
      ]
    case 'professor':
      return [INICIO, MINHAS_AULAS, { rota: '/docente/frequencia', rotulo: 'Frequência', icone: 'frequencia' }]
    case 'coordenacao':
      return [
        INICIO,
        { rota: '/coordenacao/pessoas', rotulo: 'Pessoas', icone: 'pessoas' },
        { rota: '/coordenacao/aulas', rotulo: 'Cronograma', icone: 'cronograma' },
        { rota: '/coordenacao/frequencia', rotulo: 'Frequência', icone: 'frequencia' },
        ...(lecionaAlguma ? [MINHAS_AULAS] : []),
        { rota: '/coordenacao/turmas', rotulo: 'Turmas', icone: 'turmas' },
        { rota: '/coordenacao/disciplinas', rotulo: 'Disciplinas', icone: 'disciplinas' },
        { rota: '/coordenacao/armazenamento', rotulo: 'Armazenamento', icone: 'armazenamento' },
        { rota: '/coordenacao/configuracoes', rotulo: 'Configurações', icone: 'configuracoes' },
      ]
  }
}

/** Quantos itens cabem na barra inferior do celular (o 5º botão é "Menu"). */
export const ITENS_NA_BARRA = 4
