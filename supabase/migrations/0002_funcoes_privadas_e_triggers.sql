-- F1 · 0002 — Funções auxiliares (schema privado), triggers e backfill de perfis
-- SPEC §8.3 (perfis, aulas), §9.1 item 5, §9.2, §13 F1 (backfill).

-- ---------------------------------------------------------------------------
-- Schema privado: não exposto pela API (fora de [api].schemas)
-- ---------------------------------------------------------------------------
create schema privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;

-- ---------------------------------------------------------------------------
-- Funções auxiliares de RLS (§9.2): stable, security definer, search_path vazio
-- ---------------------------------------------------------------------------
create function privado.esta_ativo()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.status = 'ativo'
  );
$$;

create function privado.eh_coordenacao()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.status = 'ativo' and p.papel = 'coordenacao'
  );
$$;

create function privado.eh_docente()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.status = 'ativo' and p.papel in ('professor', 'coordenacao')
  );
$$;

create function privado.estuda_na_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matriculas m
    join public.perfis p on p.id = m.estudante_id
    where m.turma_id = p_turma and m.estudante_id = auth.uid() and p.status = 'ativo'
  );
$$;

create function privado.leciona_na_turma(p_turma uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aulas a
    join public.perfis p on p.id = a.professor_id
    where a.turma_id = p_turma and a.professor_id = auth.uid() and p.status = 'ativo'
  );
$$;

create function privado.professor_da_aula(p_aula uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.aulas a
    join public.perfis p on p.id = a.professor_id
    where a.id = p_aula and a.professor_id = auth.uid() and p.status = 'ativo'
  );
$$;

create function privado.turma_da_aula(p_aula uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select a.turma_id from public.aulas a where a.id = p_aula;
$$;

-- Não está na lista original do §9.2: dá a aula de uma tarefa sem depender da RLS de tarefas
-- (usada na policy de entregas: "PA da aula da tarefa"). Registrada no §19.
create function privado.aula_da_tarefa(p_tarefa uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select t.aula_id from public.tarefas t where t.id = p_tarefa;
$$;

create function privado.arquivo_do_usuario(p_arquivo uuid, p_fin public.finalidade_arquivo)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.arquivos a
    where a.id = p_arquivo and a.enviado_por = auth.uid() and a.finalidade = p_fin
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- atualizado_em mantido pelo banco
create function privado.definir_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function privado.definir_atualizado_em();
create trigger aulas_atualizado_em before update on public.aulas
  for each row execute function privado.definir_atualizado_em();
create trigger materiais_atualizado_em before update on public.materiais
  for each row execute function privado.definir_atualizado_em();
create trigger tarefas_atualizado_em before update on public.tarefas
  for each row execute function privado.definir_atualizado_em();
create trigger configuracoes_atualizado_em before update on public.configuracoes
  for each row execute function privado.definir_atualizado_em();

-- Novo usuário do Auth → perfil com (id, email) e NADA mais.
-- Não copia raw_user_meta_data (nome e foto do Google) — SPEC §5.4, ADR-04.
create function privado.criar_perfil_novo_usuario()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function privado.criar_perfil_novo_usuario();

-- A pessoa responsável pela aula precisa ser docente ou coordenação, e ativa.
-- No UPDATE, só valida quando professor_id muda (editar o título de uma aula antiga não pode
-- falhar porque a pessoa foi desligada depois).
create function privado.aulas_valida_professor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.perfis p
    where p.id = new.professor_id
      and p.status = 'ativo'
      and p.papel in ('professor', 'coordenacao')
  ) then
    raise exception 'A pessoa responsável pela aula precisa ser docente ou da coordenação, com cadastro ativo.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger aulas_valida_professor_ins before insert on public.aulas
  for each row execute function privado.aulas_valida_professor();
create trigger aulas_valida_professor_upd before update of professor_id on public.aulas
  for each row when (old.professor_id is distinct from new.professor_id)
  execute function privado.aulas_valida_professor();

-- ---------------------------------------------------------------------------
-- Privilégios das funções do schema privado
-- ---------------------------------------------------------------------------
revoke all on all functions in schema privado from public;
grant execute on function
  privado.esta_ativo(),
  privado.eh_coordenacao(),
  privado.eh_docente(),
  privado.estuda_na_turma(uuid),
  privado.leciona_na_turma(uuid),
  privado.professor_da_aula(uuid),
  privado.turma_da_aula(uuid),
  privado.aula_da_tarefa(uuid),
  privado.arquivo_do_usuario(uuid, public.finalidade_arquivo)
to authenticated;

-- ---------------------------------------------------------------------------
-- Backfill: contas que já existiam em auth.users antes do trigger (login da F0 na nuvem)
-- ---------------------------------------------------------------------------
insert into public.perfis (id, email)
select u.id, u.email
from auth.users u
where u.email is not null
on conflict (id) do nothing;
