-- F1 · 0003 — RLS, privilégios e policies (SPEC §5.6, §9.1, §9.3)
-- Legenda do §9.3: C = eh_coordenacao(), PA(x) = professor_da_aula(x), ET(x) = estuda_na_turma(x),
-- LT(x) = leciona_na_turma(x), uid = (select auth.uid()).
-- Ajuste ao §9.3 (RF-03): os ramos "própria linha" (= uid) também exigem esta_ativo(), para que
-- pessoa pendente ou inativa só leia o próprio perfil.

-- ---------------------------------------------------------------------------
-- Helper extra (ADR-06): arquivo já anexado a um material da mesma aula. Permite que a pessoa que
-- substitui a docente edite/publique materiais com arquivo enviado por outra pessoa. É security
-- definer para a policy de materiais não consultar materiais (recursão de policy).
-- ---------------------------------------------------------------------------
create function privado.arquivo_em_material_da_aula(p_arquivo uuid, p_aula uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.materiais m
    where m.arquivo_id = p_arquivo and m.aula_id = p_aula
  );
$$;
revoke all on function privado.arquivo_em_material_da_aula(uuid, uuid) from public;
grant execute on function privado.arquivo_em_material_da_aula(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS em 100% das tabelas de public (§9.1 item 1)
-- ---------------------------------------------------------------------------
alter table public.perfis enable row level security;
alter table public.turmas enable row level security;
alter table public.disciplinas enable row level security;
alter table public.matriculas enable row level security;
alter table public.aulas enable row level security;
alter table public.arquivos enable row level security;
alter table public.materiais enable row level security;
alter table public.tarefas enable row level security;
alter table public.entregas enable row level security;
alter table public.presencas enable row level security;
alter table public.configuracoes enable row level security;

-- ---------------------------------------------------------------------------
-- Privilégios explícitos (§9.1 item 2 e 3). Não dependemos dos grants padrão do Supabase.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Objetos futuros criados pelo postgres em public não ganham grants automáticos: toda migration
-- nova precisa conceder o que usar. Funções deixam de nascer executáveis por PUBLIC.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres
  revoke execute on functions from public;

grant select on public.perfis to authenticated;
grant update (nome_social, pronomes, consentimento_em) on public.perfis to authenticated;

grant select, insert, update, delete on public.turmas to authenticated;
grant select, insert, update, delete on public.disciplinas to authenticated;
grant select, insert, delete on public.matriculas to authenticated;
grant select, insert, update, delete on public.aulas to authenticated;
grant select, insert, delete on public.arquivos to authenticated;
grant select, insert, update, delete on public.materiais to authenticated;
grant select, insert, update, delete on public.tarefas to authenticated;
grant select on public.entregas to authenticated;   -- escrita só via RPC
grant select on public.presencas to authenticated;  -- escrita só via RPC
grant select, insert, update, delete on public.configuracoes to authenticated;

-- ---------------------------------------------------------------------------
-- perfis
-- ---------------------------------------------------------------------------
create policy perfis_select on public.perfis for select to authenticated
  using (id = (select auth.uid()) or (select privado.eh_coordenacao()));

-- Colunas liberadas por grant: nome_social, pronomes, consentimento_em.
create policy perfis_update on public.perfis for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- turmas, disciplinas, configuracoes: leitura para ativos, escrita da coordenação
-- ---------------------------------------------------------------------------
create policy turmas_select on public.turmas for select to authenticated
  using ((select privado.esta_ativo()));
create policy turmas_insert on public.turmas for insert to authenticated
  with check ((select privado.eh_coordenacao()));
create policy turmas_update on public.turmas for update to authenticated
  using ((select privado.eh_coordenacao())) with check ((select privado.eh_coordenacao()));
create policy turmas_delete on public.turmas for delete to authenticated
  using ((select privado.eh_coordenacao()));

create policy disciplinas_select on public.disciplinas for select to authenticated
  using ((select privado.esta_ativo()));
create policy disciplinas_insert on public.disciplinas for insert to authenticated
  with check ((select privado.eh_coordenacao()));
create policy disciplinas_update on public.disciplinas for update to authenticated
  using ((select privado.eh_coordenacao())) with check ((select privado.eh_coordenacao()));
create policy disciplinas_delete on public.disciplinas for delete to authenticated
  using ((select privado.eh_coordenacao()));

create policy configuracoes_select on public.configuracoes for select to authenticated
  using ((select privado.esta_ativo()));
create policy configuracoes_insert on public.configuracoes for insert to authenticated
  with check ((select privado.eh_coordenacao()));
create policy configuracoes_update on public.configuracoes for update to authenticated
  using ((select privado.eh_coordenacao())) with check ((select privado.eh_coordenacao()));
create policy configuracoes_delete on public.configuracoes for delete to authenticated
  using ((select privado.eh_coordenacao()));

-- ---------------------------------------------------------------------------
-- matriculas
-- ---------------------------------------------------------------------------
create policy matriculas_select on public.matriculas for select to authenticated
  using (
    (estudante_id = (select auth.uid()) and (select privado.esta_ativo()))
    or (select privado.eh_coordenacao())
    or privado.leciona_na_turma(turma_id)
  );
create policy matriculas_insert on public.matriculas for insert to authenticated
  with check ((select privado.eh_coordenacao()));
create policy matriculas_delete on public.matriculas for delete to authenticated
  using ((select privado.eh_coordenacao()));

-- ---------------------------------------------------------------------------
-- aulas
-- ---------------------------------------------------------------------------
create policy aulas_select on public.aulas for select to authenticated
  using (
    (select privado.eh_coordenacao())
    or (professor_id = (select auth.uid()) and (select privado.esta_ativo()))
    or privado.estuda_na_turma(turma_id)
    or privado.leciona_na_turma(turma_id)
  );

-- Docente cria aula só para si e em turma ativa (RF-10); coordenação cria para qualquer docente.
create policy aulas_insert on public.aulas for insert to authenticated
  with check (
    (select privado.eh_coordenacao())
    or (
      (select privado.eh_docente())
      and professor_id = (select auth.uid())
      and exists (select 1 from public.turmas t where t.id = turma_id and t.ativa)
    )
  );

-- Docente edita as próprias aulas sem poder reatribuir (o check exige professor_id = uid).
create policy aulas_update on public.aulas for update to authenticated
  using (
    (select privado.eh_coordenacao())
    or (professor_id = (select auth.uid()) and (select privado.esta_ativo()))
  )
  with check (
    (select privado.eh_coordenacao())
    or professor_id = (select auth.uid())
  );

create policy aulas_delete on public.aulas for delete to authenticated
  using (
    (select privado.eh_coordenacao())
    or (professor_id = (select auth.uid()) and (select privado.esta_ativo()))
  );

-- ---------------------------------------------------------------------------
-- materiais
-- ---------------------------------------------------------------------------
create policy materiais_select on public.materiais for select to authenticated
  using (
    (select privado.eh_coordenacao())
    or privado.professor_da_aula(aula_id)
    or (publicado and privado.estuda_na_turma(privado.turma_da_aula(aula_id)))
  );

create policy materiais_insert on public.materiais for insert to authenticated
  with check (
    privado.professor_da_aula(aula_id)
    and (arquivo_id is null or privado.arquivo_do_usuario(arquivo_id, 'material'))
  );

create policy materiais_update on public.materiais for update to authenticated
  using (privado.professor_da_aula(aula_id))
  with check (
    privado.professor_da_aula(aula_id)
    and (
      arquivo_id is null
      or privado.arquivo_do_usuario(arquivo_id, 'material')
      or privado.arquivo_em_material_da_aula(arquivo_id, aula_id)
    )
  );

create policy materiais_delete on public.materiais for delete to authenticated
  using (privado.professor_da_aula(aula_id) or (select privado.eh_coordenacao()));

-- ---------------------------------------------------------------------------
-- tarefas
-- ---------------------------------------------------------------------------
create policy tarefas_select on public.tarefas for select to authenticated
  using (
    (select privado.eh_coordenacao())
    or privado.professor_da_aula(aula_id)
    or (publicada and privado.estuda_na_turma(privado.turma_da_aula(aula_id)))
  );
create policy tarefas_insert on public.tarefas for insert to authenticated
  with check (privado.professor_da_aula(aula_id));
create policy tarefas_update on public.tarefas for update to authenticated
  using (privado.professor_da_aula(aula_id))
  with check (privado.professor_da_aula(aula_id));
create policy tarefas_delete on public.tarefas for delete to authenticated
  using (privado.professor_da_aula(aula_id) or (select privado.eh_coordenacao()));

-- ---------------------------------------------------------------------------
-- entregas e presencas: só leitura por policy; escrita pelas RPCs (0004)
-- ---------------------------------------------------------------------------
create policy entregas_select on public.entregas for select to authenticated
  using (
    (estudante_id = (select auth.uid()) and (select privado.esta_ativo()))
    or privado.professor_da_aula(privado.aula_da_tarefa(tarefa_id))
    or (select privado.eh_coordenacao())
  );

create policy presencas_select on public.presencas for select to authenticated
  using (
    (estudante_id = (select auth.uid()) and (select privado.esta_ativo()))
    or privado.professor_da_aula(aula_id)
    or (select privado.eh_coordenacao())
  );

-- ---------------------------------------------------------------------------
-- arquivos
-- ---------------------------------------------------------------------------
-- As subconsultas em materiais/entregas respeitam a RLS dessas tabelas: só vê o arquivo quem vê
-- um registro que o referencia.
create policy arquivos_select on public.arquivos for select to authenticated
  using (
    (enviado_por = (select auth.uid()) and (select privado.esta_ativo()))
    or (select privado.eh_coordenacao())
    or exists (select 1 from public.materiais m where m.arquivo_id = arquivos.id)
    or exists (select 1 from public.entregas e where e.arquivo_id = arquivos.id)
  );

create policy arquivos_insert on public.arquivos for insert to authenticated
  with check (
    (select privado.esta_ativo())
    and enviado_por = (select auth.uid())
    and (finalidade = 'entrega' or (select privado.eh_docente()))
  );

create policy arquivos_delete on public.arquivos for delete to authenticated
  using (enviado_por = (select auth.uid()) or (select privado.eh_coordenacao()));
