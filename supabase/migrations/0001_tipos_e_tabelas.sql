-- F1 · 0001 — Tipos enumerados e tabelas (SPEC §8.2, §8.3)
-- Convenções: schema public, snake_case em português, PK uuid, datas timestamptz, índice em todo FK.

-- ---------------------------------------------------------------------------
-- Tipos enumerados (§8.2)
-- ---------------------------------------------------------------------------
create type public.papel_usuario as enum ('estudante', 'professor', 'coordenacao');
create type public.status_usuario as enum ('pendente', 'ativo', 'inativo');
create type public.status_presenca as enum ('presente', 'ausente', 'justificada');
create type public.tipo_material as enum ('arquivo', 'link', 'video', 'texto');
create type public.tipo_avaliacao as enum ('nota', 'conceito', 'devolutiva');
create type public.finalidade_arquivo as enum ('material', 'entrega');

-- ---------------------------------------------------------------------------
-- perfis — 1:1 com auth.users; a linha é criada por trigger (0002)
-- ---------------------------------------------------------------------------
create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome_social text,
  pronomes text,
  papel public.papel_usuario not null default 'estudante',
  status public.status_usuario not null default 'pendente',
  consentimento_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint perfis_nome_social_tamanho
    check (nome_social is null or char_length(btrim(nome_social)) between 2 and 80),
  constraint perfis_pronomes_tamanho
    check (pronomes is null or char_length(pronomes) <= 30)
);

-- ---------------------------------------------------------------------------
-- turmas, disciplinas, matriculas
-- ---------------------------------------------------------------------------
create table public.turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ano int not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.disciplinas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativa boolean not null default true
);

create table public.matriculas (
  estudante_id uuid not null references public.perfis (id) on delete cascade,
  turma_id uuid not null references public.turmas (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (estudante_id, turma_id)
);
-- O índice da PK cobre estudante_id; turma_id precisa do próprio.
create index matriculas_turma_id_idx on public.matriculas (turma_id);

-- ---------------------------------------------------------------------------
-- aulas
-- ---------------------------------------------------------------------------
create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas (id) on delete cascade,
  disciplina_id uuid not null references public.disciplinas (id) on delete restrict,
  professor_id uuid not null references public.perfis (id) on delete restrict,
  data date not null,
  inicio time,
  titulo text not null,
  criado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint aulas_titulo_tamanho check (char_length(btrim(titulo)) between 2 and 120)
);
create index aulas_turma_id_data_idx on public.aulas (turma_id, data);
create index aulas_professor_id_data_idx on public.aulas (professor_id, data);
create index aulas_disciplina_id_idx on public.aulas (disciplina_id);
create index aulas_criado_por_idx on public.aulas (criado_por);

-- ---------------------------------------------------------------------------
-- arquivos — metadados dos arquivos no Drive (inseridos pela API de Arquivos com o JWT do usuário)
-- ---------------------------------------------------------------------------
create table public.arquivos (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text not null unique,
  nome text not null,
  mime_type text not null,
  tamanho_bytes bigint not null,
  url_visualizacao text not null,
  finalidade public.finalidade_arquivo not null,
  conta_armazenamento text not null,
  enviado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint arquivos_tamanho_positivo check (tamanho_bytes > 0)
);
create index arquivos_enviado_por_idx on public.arquivos (enviado_por);

-- ---------------------------------------------------------------------------
-- materiais
-- ---------------------------------------------------------------------------
create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas (id) on delete cascade,
  tipo public.tipo_material not null,
  titulo text not null,
  conteudo text,
  url text,
  arquivo_id uuid references public.arquivos (id) on delete restrict,
  publicado boolean not null default false,
  ordem int not null default 0,
  criado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint materiais_tipo_campos check (
    case tipo
      when 'texto' then conteudo is not null and btrim(conteudo) <> ''
      when 'link' then url is not null and btrim(url) <> ''
      when 'video' then url is not null and btrim(url) <> ''
      when 'arquivo' then arquivo_id is not null
    end
  )
);
create index materiais_aula_id_idx on public.materiais (aula_id);
create index materiais_arquivo_id_idx on public.materiais (arquivo_id);
create index materiais_criado_por_idx on public.materiais (criado_por);

-- ---------------------------------------------------------------------------
-- tarefas
-- ---------------------------------------------------------------------------
create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references public.aulas (id) on delete cascade,
  titulo text not null,
  instrucoes text,
  prazo timestamptz,
  tipo_avaliacao public.tipo_avaliacao not null default 'nota',
  opcoes_conceito text[],
  publicada boolean not null default false,
  criado_por uuid default auth.uid() references public.perfis (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tarefas_opcoes_conceito check (
    tipo_avaliacao <> 'conceito'
    or (opcoes_conceito is not null and cardinality(opcoes_conceito) > 0)
  )
);
create index tarefas_aula_id_idx on public.tarefas (aula_id);
create index tarefas_criado_por_idx on public.tarefas (criado_por);

-- ---------------------------------------------------------------------------
-- entregas — escrita só por RPC (0004)
-- ---------------------------------------------------------------------------
create table public.entregas (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas (id) on delete cascade,
  estudante_id uuid not null references public.perfis (id) on delete cascade,
  arquivo_id uuid references public.arquivos (id) on delete restrict,
  link text,
  comentario text,
  enviada_em timestamptz not null default now(),
  nota numeric(3, 1),
  conceito text,
  devolutiva text,
  avaliada_por uuid references public.perfis (id) on delete set null,
  avaliada_em timestamptz,
  constraint entregas_tarefa_estudante_unica unique (tarefa_id, estudante_id),
  constraint entregas_algum_conteudo check (
    arquivo_id is not null or link is not null or comentario is not null
  ),
  constraint entregas_comentario_tamanho check (comentario is null or char_length(comentario) <= 2000),
  constraint entregas_nota_intervalo check (nota is null or nota between 0 and 10)
);
-- O índice do UNIQUE cobre tarefa_id.
create index entregas_estudante_id_idx on public.entregas (estudante_id);
create index entregas_arquivo_id_idx on public.entregas (arquivo_id);
create index entregas_avaliada_por_idx on public.entregas (avaliada_por);

-- ---------------------------------------------------------------------------
-- presencas — escrita só por RPC (0004)
-- ---------------------------------------------------------------------------
create table public.presencas (
  aula_id uuid not null references public.aulas (id) on delete cascade,
  estudante_id uuid not null references public.perfis (id) on delete cascade,
  status public.status_presenca not null,
  -- Sem FK (SPEC §8.3): uma FK aqui impediria excluir, pelo runbook LGPD, docente que já fez chamada.
  registrado_por uuid not null,
  registrado_em timestamptz not null default now(),
  primary key (aula_id, estudante_id)
);
create index presencas_estudante_id_idx on public.presencas (estudante_id);

-- ---------------------------------------------------------------------------
-- configuracoes
-- ---------------------------------------------------------------------------
create table public.configuracoes (
  chave text primary key,
  valor jsonb not null,
  atualizado_em timestamptz not null default now()
);
