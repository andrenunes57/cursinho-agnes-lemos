import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  ChartColumn,
  ClipboardList,
  HardDrive,
  House,
  LogOut,
  Menu,
  Presentation,
  School,
  Settings,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { nomeComPronomes, useAuth } from '../auth/contexto'
import { useLecionaAlgumaAula } from '../auth/useLecionaAlgumaAula'
import { ITENS_NA_BARRA, itensDoMenu, type ItemMenu, type NomeIcone } from './menu'

const ICONES: Record<NomeIcone, LucideIcon> = {
  inicio: House,
  aulas: CalendarDays,
  tarefas: ClipboardList,
  frequencia: ChartColumn,
  pessoas: Users,
  turmas: School,
  disciplinas: BookOpen,
  cronograma: CalendarRange,
  armazenamento: HardDrive,
  configuracoes: Settings,
  'minhas-aulas': Presentation,
  perfil: UserRound,
}

const PERFIL: ItemMenu = { rota: '/perfil', rotulo: 'Meu perfil', icone: 'perfil' }

function classeLink({ isActive }: { isActive: boolean }) {
  return `flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium ${
    isActive ? 'bg-marca text-white' : 'text-texto hover:bg-marca-clara'
  }`
}

function LinkMenu({ item }: { item: ItemMenu }) {
  const Icone = ICONES[item.icone]
  return (
    <NavLink to={item.rota} end={item.rota === '/'} className={classeLink}>
      <Icone aria-hidden="true" className="size-5 shrink-0" />
      {item.rotulo}
    </NavLink>
  )
}

/**
 * Layout da área logada e ativa (SPEC §11): cabeçalho com nome social + pronomes e "Sair"
 * (nunca foto), navegação lateral acima de 768 px e barra inferior no celular.
 */
export function LayoutApp() {
  const { perfil, sair } = useAuth()
  const lecionaAlguma = useLecionaAlgumaAula()
  const { pathname } = useLocation()
  // Guarda a rota em que o menu do celular foi aberto: navegar o fecha sem precisar de efeito.
  const [menuAbertoEm, setMenuAbertoEm] = useState<string | null>(null)
  const menuAberto = menuAbertoEm === pathname
  const fecharMenu = () => setMenuAbertoEm(null)
  const idMenu = useId()

  useEffect(() => {
    if (!menuAberto) return
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fecharMenu()
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [menuAberto])

  if (!perfil) return null

  const itens = itensDoMenu(perfil.papel, lecionaAlguma)
  const naBarra = itens.slice(0, ITENS_NA_BARRA)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie">
        {/* No celular o nome vai para uma 2ª linha; acima de 768 px fica ao lado do "Sair". */}
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 px-4 py-1">
          <Link to="/" className="min-h-11 content-center font-bold text-marca">
            Cursinho Agnes Lemos
          </Link>
          <div className="contents largo:flex largo:min-w-0 largo:items-center largo:gap-2">
            <Link
              to="/perfil"
              className="order-last min-h-11 w-full min-w-0 content-center truncate text-texto underline-offset-4 hover:underline largo:order-none largo:w-auto"
            >
              {nomeComPronomes(perfil)}
            </Link>
            <button
              type="button"
              onClick={() => void sair()}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-semibold text-marca hover:bg-marca-clara"
            >
              <LogOut aria-hidden="true" className="size-5" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <nav aria-label="Menu principal" className="hidden w-60 shrink-0 border-r border-borda p-3 largo:block">
          <ul className="flex flex-col gap-1">
            {itens.map((item) => (
              <li key={item.rota}>
                <LinkMenu item={item} />
              </li>
            ))}
            <li className="mt-2 border-t border-borda pt-2">
              <LinkMenu item={PERFIL} />
            </li>
          </ul>
        </nav>

        <main id="conteudo" className="flex min-w-0 flex-1 flex-col gap-6 px-4 pt-6 pb-28 largo:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Celular (≤ 768 px): barra inferior com os primeiros itens + "Menu" com todos. */}
      <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-20 largo:hidden">
        {menuAberto && (
          <div id={idMenu} className="max-h-[70dvh] overflow-y-auto border-t border-borda bg-superficie p-3 shadow-lg">
            <p className="px-3 pb-2 text-sm text-texto-suave">{nomeComPronomes(perfil)}</p>
            <ul className="flex flex-col gap-1">
              {itens.map((item) => (
                <li key={item.rota}>
                  <LinkMenu item={item} />
                </li>
              ))}
              <li className="mt-2 border-t border-borda pt-2">
                <LinkMenu item={PERFIL} />
              </li>
            </ul>
          </div>
        )}
        <ul className="flex border-t border-borda bg-superficie">
          {naBarra.map((item) => {
            const Icone = ICONES[item.icone]
            return (
              <li key={item.rota} className="flex-1">
                <NavLink
                  to={item.rota}
                  end={item.rota === '/'}
                  className={({ isActive }) =>
                    `flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium ${
                      isActive ? 'text-marca underline decoration-2 underline-offset-4' : 'text-texto-suave'
                    }`
                  }
                >
                  <Icone aria-hidden="true" className="size-5" />
                  {item.rotulo}
                </NavLink>
              </li>
            )
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-expanded={menuAberto}
              aria-controls={idMenu}
              onClick={() => (menuAberto ? fecharMenu() : setMenuAbertoEm(pathname))}
              className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-texto-suave"
            >
              {menuAberto ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
              {menuAberto ? 'Fechar' : 'Menu'}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
