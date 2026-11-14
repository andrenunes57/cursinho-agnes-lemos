# CLAUDE.md — Cursinho Agnes Lemos

Sistema web (PI 2 Univesp) de presença, materiais por aula, entregas e gestão de pessoas do
Cursinho Popular Professor Agnes Lemos (Campinas-SP).

**Fonte da verdade: [SPEC.md](SPEC.md).** Antes de codar, leia as seções que a fase atual indica
(§13). O que não está na SPEC está fora do escopo. Uma mudança de escopo entra primeiro na SPEC
(§19 Histórico) e só depois no código.

## Estado atual

- **F0, F1 e F2 concluídas** (13/11/2026). As 5 migrations estão na nuvem. A conta do dev já é
  coordenação ativa em produção (§16.1).
- **F3 implementada** (telas da coordenação, DoD local verde). Falta validar em produção (2ª conta
  como estudante, 3ª como docente, aulas para ela). **Depois: F4** (§4.3, §10).
- Rotas das F4 a F6 já estão em `src/router.tsx` com `provisoria(...)`: trocar pela página real.
- Reutilizar da F3: `components/AulaForm.tsx` (sem `docentes` = docente criando a própria aula),
  `ui/Abas`, `ui/Select`, `ui/Confirmacao`, `ui/Etiqueta`, `lib/datas.ts`, `lib/erros.ts`.
- Depois de rodar o E2E, o pgTAP exige `npm run db:reset && npm run db:test` (as fixtures colidem
  com as contas do E2E).
- E-mail de contato da LGPD pendente em `src/lib/contato.ts` (trocar antes do go-live).
- Recursos na nuvem e identificadores: SPEC §12.3.1.
- `.env.local` aponta para o stack **local** do Supabase (`npx supabase status`).
- **CLI 3.x:** `db push`, `db test`, `migration list` etc. vão para o stack **local** por padrão.
  Para a nuvem, passar `--remote`.

## Comandos

| Objetivo | Comando |
|---|---|
| Dev | `npm run dev` → http://localhost:5173/cursinho-agnes-lemos/ |
| Qualidade (o mesmo que o CI roda) | `npm run lint && npm run typecheck && npm test && npm run build` |
| E2E + acessibilidade (axe) | `npm run db:start` e depois `npm run test:e2e` (build com o stack local + preview na porta 4173) |
| Banco local (Docker/Rancher Desktop ligado) | `npm run db:start` · `npm run db:reset` · `npm run db:test` · `npm run db:types` |
| Aplicar migrations na nuvem | `npx supabase db push --remote` (sem `--remote` o CLI 3.x vai para o stack local) |

## Regras (resumo do SPEC §15)

- **Consultar o Context7** antes de usar a API de qualquer biblioteca. Use as versões **fixas** do
  `package.json`. Atenção às versões novas:
  - React Router **v8**: `createBrowserRouter` vem de `react-router` e `RouterProvider` de `react-router/dom`.
  - Vite **8** (Rolldown), TypeScript **7**, Vitest **5**, Tailwind **v4** (`@import "tailwindcss"`, tokens em `@theme`).
  - Lint com **oxlint** (padrão do create-vite 9).
- **Banco:**
  - Os tipos vêm de `npm run db:types` e nunca são escritos à mão.
  - Migration já aplicada é imutável: crie uma nova.
- **Segurança fica no banco**: RLS + RPC + teste pgTAP. Guarda de rota e botão escondido são só UX.
- **Identidade:**
  - Nunca exibir o nome nem a foto da conta Google; usar sempre o nome social + pronomes.
  - UI em pt-BR, com linguagem inclusiva.
- **Segredos nunca entram no repo.** Só a chave *publishable* vai para o front (`.env.production`).
  Senha do banco, chave secreta do OAuth e `sb_secret_…` ficam fora do git.
- **Máquina:** usar `py` (nunca `python`) e `pwsh` (nunca `powershell`). O shell do Claude Code é Git Bash.
- **Fechar uma fase** exige:
  - DoD verde
  - conferência no viewport de 375 px
  - commit em Conventional Commits, por exemplo `feat(f1): ...`
