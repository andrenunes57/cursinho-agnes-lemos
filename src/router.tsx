import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequirePapel, RequireSessao, RequireStatus } from './auth/guardas'
import { LayoutApp } from './layout/LayoutApp'
import { RaizApp } from './layout/RaizApp'
import { Aguardando } from './pages/acesso/Aguardando'
import { Configuracoes } from './pages/coordenacao/Configuracoes'
import { Cronograma } from './pages/coordenacao/Cronograma'
import { Disciplinas } from './pages/coordenacao/Disciplinas'
import { Pessoas } from './pages/coordenacao/Pessoas'
import { Turmas } from './pages/coordenacao/Turmas'
import { PrimeiroAcesso } from './pages/acesso/PrimeiroAcesso'
import { AulaDocente } from './pages/docente/AulaDocente'
import { MinhasAulas } from './pages/docente/MinhasAulas'
import { Aula } from './pages/estudante/Aula'
import { Aulas } from './pages/estudante/Aulas'
import { EmConstrucao } from './pages/EmConstrucao'
import { Inicio } from './pages/Inicio'
import { NaoEncontrado } from './pages/NaoEncontrado'
import { Perfil } from './pages/Perfil'
import { Entrar } from './pages/publico/Entrar'
import { Privacidade } from './pages/publico/Privacidade'

// basename = base do Vite sem a barra final ('/cursinho-agnes-lemos'). SPEC §6.3 / §12.3.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

/** Rotas das fases F5 e F6, por enquanto com a página "em construção" (SPEC §11, §13). */
const provisoria = (path: string, titulo: string): RouteObject => ({
  path,
  element: <EmConstrucao titulo={titulo} />,
})

export const rotas: RouteObject[] = [
  {
    element: <RaizApp />,
    children: [
      // Públicas
      { path: '/entrar', element: <Entrar /> },
      { path: '/privacidade', element: <Privacidade /> },

      // Guardas (SPEC §11): 1. sessão → 2. onboarding → 3. ativo → 4. papel
      {
        element: <RequireSessao />,
        children: [
          { path: '/primeiro-acesso', element: <PrimeiroAcesso /> },
          { path: '/aguardando', element: <Aguardando /> },
          {
            element: <RequireStatus />,
            children: [
              {
                element: <LayoutApp />,
                children: [
                  { path: '/', element: <Inicio /> },
                  { path: '/perfil', element: <Perfil /> },
                  {
                    element: <RequirePapel papeis={['estudante']} />,
                    children: [
                      { path: '/aulas', element: <Aulas /> },
                      { path: '/aulas/:id', element: <Aula /> },
                      provisoria('/tarefas', 'Tarefas'),
                      provisoria('/tarefas/:id', 'Tarefa'),
                      provisoria('/frequencia', 'Minha frequência'),
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['professor', 'coordenacao']} />,
                    children: [
                      { path: '/docente/aulas', element: <MinhasAulas /> },
                      { path: '/docente/aulas/:id', element: <AulaDocente /> },
                      provisoria('/docente/tarefas/:id/entregas', 'Entregas'),
                      provisoria('/docente/frequencia', 'Frequência das minhas aulas'),
                    ],
                  },
                  {
                    element: <RequirePapel papeis={['coordenacao']} />,
                    children: [
                      { path: '/coordenacao/pessoas', element: <Pessoas /> },
                      { path: '/coordenacao/turmas', element: <Turmas /> },
                      { path: '/coordenacao/disciplinas', element: <Disciplinas /> },
                      { path: '/coordenacao/aulas', element: <Cronograma /> },
                      provisoria('/coordenacao/frequencia', 'Frequência'),
                      provisoria('/coordenacao/armazenamento', 'Armazenamento'),
                      { path: '/coordenacao/configuracoes', element: <Configuracoes /> },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: <NaoEncontrado /> },
    ],
  },
]

export const router = createBrowserRouter(rotas, { basename })
