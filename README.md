# Cursinho Popular Professor Agnes Lemos — Sistema

Sistema web gratuito para o **Cursinho Popular Professor Agnes Lemos** (Campinas-SP), um cursinho
pré-vestibular popular e trans-referenciado. Ele centraliza:

- a **presença** por aula;
- os **materiais por aula**;
- as **entregas de trabalhos com devolutiva**;
- a **gestão de pessoas, turmas e cronograma**.

Projeto Integrador 2 — Univesp.

- **App:** https://andrenunes57.github.io/cursinho-agnes-lemos/
- **Especificação técnica (fonte da verdade):** [SPEC.md](SPEC.md)

## Stack (custo zero)

| Parte | Tecnologia |
|---|---|
| Front-end | React + TypeScript + Vite + React Router + Tailwind CSS, publicado no GitHub Pages |
| Back-end | Supabase (plano Free): login com Google, PostgreSQL com Row Level Security e API REST/RPC |
| Arquivos | Google Drive, via uma "API de Arquivos" em Google Apps Script (fase F4) |
| Testes | Vitest + Testing Library, Playwright + axe (acessibilidade) e pgTAP (banco, a partir da F1) |

## Como rodar

Pré-requisitos: Node 22.22+ (o projeto usa 26) e, a partir da F1, Docker para o Supabase local.

```bash
npm ci
cp .env.production .env.local   # dev apontando para o Supabase na nuvem (até a F1)
npm run dev                     # http://localhost:5173/cursinho-agnes-lemos/
```

Verificações (as mesmas do CI):

```bash
npm run lint && npm run typecheck && npm test && npm run build
npm run test:e2e   # E2E + acessibilidade; na 1ª vez: npx playwright install chromium
```

## Deploy

Todo push na `main` publica no GitHub Pages pelo workflow `deploy.yml`. As variáveis públicas do
build ficam em `.env.production`. Nenhum segredo vai para o repositório.
