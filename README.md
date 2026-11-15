# Cursinho Popular Professor Agnes Lemos — Sistema

Sistema web gratuito para o **Cursinho Popular Professor Agnes Lemos** (Campinas-SP), um cursinho
pré-vestibular popular e trans-referenciado.

Projeto Integrador 2 — Univesp.

- **App:** https://andrenunes57.github.io/cursinho-agnes-lemos/ (piloto para uso no computador;
  o layout se adapta ao zoom do navegador até 400%)
- **Especificação técnica (fonte da verdade):** [SPEC.md](SPEC.md)

## O que o sistema faz

| Papel | Funcionalidades |
|---|---|
| **Estudante** | Agenda das aulas, materiais publicados (arquivos, links, vídeos e textos), envio e reenvio de tarefas, notas, conceitos e devolutivas, e a própria frequência |
| **Docente** | Aulas próprias, materiais em rascunho ou publicados, tarefas com nota, conceito ou devolutiva, avaliação das entregas, chamada por aula e relatório de frequência |
| **Coordenação** | Aprovação de cadastros, papéis e matrículas, turmas, disciplinas, cronograma de aulas, relatório de frequência com CSV, uso do Drive e configurações |

Login só com Google. A pessoa informa o nome social e os pronomes no primeiro acesso, e o app
nunca exibe o nome nem a foto da conta Google.

## Stack (custo zero)

| Parte | Tecnologia |
|---|---|
| Front-end | React + TypeScript + Vite + React Router + Tailwind CSS, publicado no GitHub Pages |
| Back-end | Supabase (plano Free): login com Google, PostgreSQL com Row Level Security e RPCs |
| Arquivos | Google Drive, via uma "API de Arquivos" em Google Apps Script (`apps-script/`) |
| Testes | Vitest + Testing Library, Playwright + axe (acessibilidade, 1280 px e 320 px, que equivale a zoom de 400%) e pgTAP (banco) |

## Como rodar

Pré-requisitos: Node 22.22+ e Docker (ou Rancher Desktop) para o Supabase local.
O passo a passo completo está em [docs/setup.md](docs/setup.md).

```bash
npm ci
npm run db:start               # Supabase local (crie o .env.local, veja docs/setup.md)
npm run dev                    # http://localhost:5173/cursinho-agnes-lemos/
```

Verificações:

```bash
npm run lint && npm run typecheck && npm test && npm run build   # o mesmo que o CI roda
npm run db:reset && npm run db:test                              # pgTAP (RLS e RPCs)
npm run test:e2e                                                 # E2E + axe (precisa do db:start)
```

## Deploy

Todo push na `main` publica no GitHub Pages pelo workflow `deploy.yml`. As variáveis públicas do
build ficam em `.env.production`. Nenhum segredo vai para o repositório. Migrations e API de
Arquivos: [docs/setup.md](docs/setup.md#7-publicar).

## Operação

- [docs/operacao.md](docs/operacao.md): primeira coordenação, ping diário, backup, Drive cheio e
  exclusão de dados (LGPD).
- [docs/transferencia-de-contas.md](docs/transferencia-de-contas.md): passar os serviços para as
  contas do cursinho (**obrigatório antes do uso real**).
