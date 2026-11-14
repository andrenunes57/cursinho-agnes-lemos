-- F1 · 0004 — RPCs (SPEC §9.4), expostas via POST /rest/v1/rpc/<nome>
-- Todas (exceto ping) são security definer com search_path vazio, nomes qualificados e validação
-- de auth.uid()/status/papel DENTRO da função. Erros em pt-BR; permissão negada usa 42501.

-- ---------------------------------------------------------------------------
-- Gestão de pessoas (coordenação)
-- ---------------------------------------------------------------------------
create function public.aprovar_cadastros(
  p_ids uuid[],
  p_papel public.papel_usuario default 'estudante',
  p_turma_id uuid default null
)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_qtd int;
begin
  if not privado.eh_coordenacao() then
    raise exception 'Somente a coordenação pode aprovar cadastros.' using errcode = '42501';
  end if;
  if p_turma_id is not null and not exists (select 1 from public.turmas t where t.id = p_turma_id) then
    raise exception 'Turma não encontrada.';
  end if;

  with aprovados as (
    update public.perfis p
       set status = 'ativo', papel = coalesce(p_papel, 'estudante')
     where p.id = any (p_ids) and p.status = 'pendente'
    returning p.id
  ), novas_matriculas as (
    insert into public.matriculas (estudante_id, turma_id)
    select a.id, p_turma_id from aprovados a
     where coalesce(p_papel, 'estudante') = 'estudante' and p_turma_id is not null
    on conflict do nothing
  )
  select count(*) into v_qtd from aprovados;

  return v_qtd;
end;
$$;

-- Trava as linhas da coordenação ativa, para que duas mudanças simultâneas não zerem a coordenação.
create function public.definir_papel(p_id uuid, p_papel public.papel_usuario)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_coordenacao() then
    raise exception 'Somente a coordenação pode alterar papéis.' using errcode = '42501';
  end if;
  if p_papel is null then
    raise exception 'Informe o papel.';
  end if;

  perform 1 from public.perfis p where p.papel = 'coordenacao' and p.status = 'ativo' for update;

  update public.perfis p set papel = p_papel where p.id = p_id;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;

  if not exists (select 1 from public.perfis p where p.papel = 'coordenacao' and p.status = 'ativo') then
    raise exception 'Não é possível deixar a coordenação sem nenhuma pessoa ativa.';
  end if;
end;
$$;

create function public.definir_status(p_id uuid, p_status public.status_usuario)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_coordenacao() then
    raise exception 'Somente a coordenação pode alterar o status de cadastros.' using errcode = '42501';
  end if;
  if p_status is null then
    raise exception 'Informe o status.';
  end if;

  perform 1 from public.perfis p where p.papel = 'coordenacao' and p.status = 'ativo' for update;

  update public.perfis p set status = p_status where p.id = p_id;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;

  if not exists (select 1 from public.perfis p where p.papel = 'coordenacao' and p.status = 'ativo') then
    raise exception 'Não é possível deixar a coordenação sem nenhuma pessoa ativa.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Consultas de pessoas (sem expor e-mail)
-- ---------------------------------------------------------------------------
create function public.estudantes_da_turma(p_turma_id uuid)
returns table (id uuid, nome_social text, pronomes text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not (privado.eh_coordenacao() or privado.leciona_na_turma(p_turma_id)) then
    raise exception 'Sem permissão para ver estudantes desta turma.' using errcode = '42501';
  end if;

  return query
    select p.id, p.nome_social, p.pronomes
      from public.matriculas m
      join public.perfis p on p.id = m.estudante_id
     where m.turma_id = p_turma_id and p.status = 'ativo'
     order by p.nome_social;
end;
$$;

create function public.equipe()
returns table (id uuid, nome_social text, pronomes text, papel public.papel_usuario)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not privado.esta_ativo() then
    raise exception 'Seu cadastro ainda não está ativo.' using errcode = '42501';
  end if;

  return query
    select p.id, p.nome_social, p.pronomes, p.papel
      from public.perfis p
     where p.status = 'ativo' and p.papel in ('professor', 'coordenacao')
     order by p.nome_social;
end;
$$;

-- ---------------------------------------------------------------------------
-- Entregas
-- ---------------------------------------------------------------------------
create function public.enviar_entrega(
  p_tarefa_id uuid,
  p_arquivo_id uuid default null,
  p_link text default null,
  p_comentario text default null
)
returns public.entregas language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_tarefa public.tarefas;
  v_turma uuid;
  v_link text := nullif(btrim(p_link), '');
  v_comentario text := nullif(btrim(p_comentario), '');
  v_entrega public.entregas;
begin
  select t.* into v_tarefa from public.tarefas t where t.id = p_tarefa_id;
  if not found then
    raise exception 'Tarefa não encontrada.';
  end if;
  v_turma := privado.turma_da_aula(v_tarefa.aula_id);

  if v_uid is null or not privado.estuda_na_turma(v_turma) then
    raise exception 'Só estudantes da turma podem enviar esta entrega.' using errcode = '42501';
  end if;
  if not v_tarefa.publicada then
    raise exception 'Esta tarefa ainda não foi publicada.';
  end if;
  if p_arquivo_id is null and v_link is null and v_comentario is null then
    raise exception 'Envie um arquivo, um link ou um comentário.';
  end if;
  if p_arquivo_id is not null and not privado.arquivo_do_usuario(p_arquivo_id, 'entrega') then
    raise exception 'O arquivo informado não pertence a você ou não é de entrega.' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.entregas e
     where e.tarefa_id = p_tarefa_id and e.estudante_id = v_uid and e.avaliada_em is not null
  ) then
    raise exception 'Esta entrega já foi avaliada e não pode mais ser reenviada.';
  end if;

  insert into public.entregas as e (tarefa_id, estudante_id, arquivo_id, link, comentario, enviada_em)
  values (p_tarefa_id, v_uid, p_arquivo_id, v_link, v_comentario, now())
  on conflict (tarefa_id, estudante_id) do update
     set arquivo_id = excluded.arquivo_id,
         link = excluded.link,
         comentario = excluded.comentario,
         enviada_em = excluded.enviada_em
   where e.avaliada_em is null
  returning e.* into v_entrega;

  if v_entrega.id is null then
    -- Avaliada entre a verificação e o upsert.
    raise exception 'Esta entrega já foi avaliada e não pode mais ser reenviada.';
  end if;

  return v_entrega;
end;
$$;

create function public.avaliar_entrega(
  p_entrega_id uuid,
  p_nota numeric default null,
  p_conceito text default null,
  p_devolutiva text default null
)
returns public.entregas language plpgsql security definer set search_path = '' as $$
declare
  v_entrega public.entregas;
  v_tarefa public.tarefas;
  v_conceito text := nullif(btrim(p_conceito), '');
  v_devolutiva text := nullif(btrim(p_devolutiva), '');
begin
  select e.* into v_entrega from public.entregas e where e.id = p_entrega_id;
  if not found then
    raise exception 'Entrega não encontrada.';
  end if;
  select t.* into v_tarefa from public.tarefas t where t.id = v_entrega.tarefa_id;

  if not privado.professor_da_aula(v_tarefa.aula_id) then
    raise exception 'Só a pessoa docente da aula pode avaliar esta entrega.' using errcode = '42501';
  end if;

  case v_tarefa.tipo_avaliacao
    when 'nota' then
      if p_nota is null or p_nota < 0 or p_nota > 10 then
        raise exception 'A nota precisa estar entre 0 e 10.';
      end if;
      if v_conceito is not null then
        raise exception 'Esta tarefa é avaliada por nota; não informe conceito.';
      end if;
    when 'conceito' then
      if v_conceito is null or not (v_conceito = any (v_tarefa.opcoes_conceito)) then
        raise exception 'Escolha um dos conceitos definidos na tarefa.';
      end if;
      if p_nota is not null then
        raise exception 'Esta tarefa é avaliada por conceito; não informe nota.';
      end if;
    when 'devolutiva' then
      if v_devolutiva is null then
        raise exception 'Escreva a devolutiva.';
      end if;
      if p_nota is not null or v_conceito is not null then
        raise exception 'Esta tarefa é avaliada só por devolutiva; não informe nota nem conceito.';
      end if;
  end case;

  update public.entregas e
     set nota = round(p_nota, 1),
         conceito = v_conceito,
         devolutiva = v_devolutiva,
         avaliada_por = auth.uid(),
         avaliada_em = now()
   where e.id = p_entrega_id
  returning e.* into v_entrega;

  return v_entrega;
end;
$$;

-- ---------------------------------------------------------------------------
-- Presença
-- ---------------------------------------------------------------------------
-- p_itens = [{"estudante_id": "<uuid>", "status": "presente|ausente|justificada"}, ...]
create function public.registrar_chamada(p_aula_id uuid, p_itens jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_aula public.aulas;
  v_qtd int;
begin
  select a.* into v_aula from public.aulas a where a.id = p_aula_id;
  if not found then
    raise exception 'Aula não encontrada.';
  end if;
  -- Só a pessoa docente da aula; a coordenação NÃO faz chamada (ADR-06).
  if not privado.professor_da_aula(p_aula_id) then
    raise exception 'Só a pessoa docente da aula pode fazer a chamada.' using errcode = '42501';
  end if;
  if v_aula.data > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'Não é possível fazer a chamada de uma aula com data futura.';
  end if;
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'A chamada precisa de uma lista de estudantes.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) i
     where jsonb_typeof(i) <> 'object'
        or i ->> 'estudante_id' is null
        or i ->> 'estudante_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or coalesce(i ->> 'status', '') not in ('presente', 'ausente', 'justificada')
  ) then
    raise exception 'Item de chamada inválido: informe estudante_id e status (presente, ausente ou justificada).';
  end if;
  if (select count(*) from jsonb_array_elements(p_itens)) <>
     (select count(distinct (i ->> 'estudante_id')::uuid) from jsonb_array_elements(p_itens) i) then
    raise exception 'A lista repete a mesma pessoa estudante.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_itens) i
     where not exists (
       select 1 from public.matriculas m
        where m.turma_id = v_aula.turma_id and m.estudante_id = (i ->> 'estudante_id')::uuid
     )
  ) then
    raise exception 'Há pessoa estudante sem matrícula na turma desta aula.';
  end if;

  insert into public.presencas as p (aula_id, estudante_id, status, registrado_por, registrado_em)
  select p_aula_id,
         (i ->> 'estudante_id')::uuid,
         (i ->> 'status')::public.status_presenca,
         auth.uid(),
         now()
    from jsonb_array_elements(p_itens) i
  on conflict (aula_id, estudante_id) do update
     set status = excluded.status,
         registrado_por = excluded.registrado_por,
         registrado_em = excluded.registrado_em;

  get diagnostics v_qtd = row_count;
  return v_qtd;
end;
$$;

-- Regra de frequência (§4.5): % = presentes ÷ aulas com chamada registrada para a pessoa × 100,
-- 1 casa. Justificadas contam como não presença. Escopo aplicado aqui dentro:
-- coordenação → todas as aulas da turma; quem leciona na turma → só as próprias aulas;
-- estudante da turma → só a própria linha. p_de/p_ate nulos = sem limite.
create function public.frequencia(p_turma_id uuid, p_de date default null, p_ate date default null)
returns table (
  estudante_id uuid,
  nome_social text,
  aulas_com_chamada int,
  presentes int,
  ausentes int,
  justificadas int,
  percentual numeric
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_escopo text;
begin
  if privado.eh_coordenacao() then
    v_escopo := 'coordenacao';
  elsif privado.leciona_na_turma(p_turma_id) then
    v_escopo := 'docente';
  elsif privado.estuda_na_turma(p_turma_id) then
    v_escopo := 'estudante';
  else
    raise exception 'Sem permissão para ver a frequência desta turma.' using errcode = '42501';
  end if;

  return query
    select m.estudante_id,
           p.nome_social,
           count(pr.aula_id)::int,
           (count(*) filter (where pr.status = 'presente'))::int,
           (count(*) filter (where pr.status = 'ausente'))::int,
           (count(*) filter (where pr.status = 'justificada'))::int,
           round(100.0 * count(*) filter (where pr.status = 'presente') / nullif(count(pr.aula_id), 0), 1)
      from public.matriculas m
      join public.perfis p on p.id = m.estudante_id
      left join (public.presencas pr join public.aulas a on a.id = pr.aula_id)
        on pr.estudante_id = m.estudante_id
       and a.turma_id = p_turma_id
       and (p_de is null or a.data >= p_de)
       and (p_ate is null or a.data <= p_ate)
       and (v_escopo <> 'docente' or a.professor_id = v_uid)
     where m.turma_id = p_turma_id
       and (v_escopo <> 'estudante' or m.estudante_id = v_uid)
     group by m.estudante_id, p.nome_social
     order by p.nome_social;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep-alive (§16.4)
-- ---------------------------------------------------------------------------
create function public.ping()
returns text language sql stable set search_path = '' as $$
  select 'ok'::text;
$$;

-- ---------------------------------------------------------------------------
-- Execução: só o que está listado no §9.4
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.aprovar_cadastros(uuid[], public.papel_usuario, uuid),
  public.definir_papel(uuid, public.papel_usuario),
  public.definir_status(uuid, public.status_usuario),
  public.estudantes_da_turma(uuid),
  public.equipe(),
  public.enviar_entrega(uuid, uuid, text, text),
  public.avaliar_entrega(uuid, numeric, text, text),
  public.registrar_chamada(uuid, jsonb),
  public.frequencia(uuid, date, date),
  public.ping()
to authenticated;

grant execute on function public.ping() to anon;
