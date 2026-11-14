-- RLS ativa em 100% das tabelas de public e superfície mínima para anon (SPEC §5.6, §9.1, §14.1)
begin;
\ir _fixtures.psql
select plan(6);

select is_empty(
  $$ select c.relname from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'nenhuma tabela de public com RLS desligada'
);

select set_eq(
  $$ select c.relname::text from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') $$,
  array['perfis', 'turmas', 'disciplinas', 'matriculas', 'aulas', 'arquivos', 'materiais',
        'tarefas', 'entregas', 'presencas', 'configuracoes'],
  'as 11 tabelas do §8.3 existem (e só elas)'
);

select is_empty(
  $$ select c.relname from pg_class c
      where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm')
        and has_table_privilege('anon', c.oid, 'select, insert, update, delete') $$,
  'anon não tem privilégio em nenhuma tabela de public'
);

select is(
  (select string_agg(p.proname::text, ',') from pg_proc p
    where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute')),
  'ping',
  'anon só executa rpc/ping'
);

select is_empty(
  $$ select p.proname from pg_proc p
      where p.pronamespace in ('public'::regnamespace, 'privado'::regnamespace)
        and p.prosecdef
        and not coalesce(p.proconfig @> array['search_path=""'], false) $$,
  'toda função security definer tem search_path vazio'
);

select ok(
  not has_schema_privilege('anon', 'privado', 'usage'),
  'anon não usa o schema privado'
);

select * from finish();
rollback;
