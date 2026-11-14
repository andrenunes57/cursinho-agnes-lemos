-- tarefas: publicadas visíveis à turma, escrita só da docente da aula (SPEC §7.2, §9.3, RF-15)
begin;
\ir _fixtures.psql
select plan(16);

select testes.entrar_anon();
select throws_ok($$ select * from public.tarefas $$, '42501', null, 'anon não lê tarefas');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select set_eq($$ select id from public.tarefas $$,
  array[testes.id('tar_nota'), testes.id('tar_conceito'), testes.id('tar_devolutiva')],
  'estudante vê só as tarefas publicadas da turma');
reset role;

select testes.entrar('est2');
select set_eq($$ select id from public.tarefas $$, array[testes.id('tar_b')], 'outra estudante vê só a turma dela');
reset role;

select testes.entrar('pend');
select is_empty($$ select id from public.tarefas $$, 'pendente não vê tarefas');
reset role;

select testes.entrar('prof');
select set_eq($$ select id from public.tarefas $$,
  array[testes.id('tar_nota'), testes.id('tar_rascunho'), testes.id('tar_conceito'), testes.id('tar_devolutiva')],
  'docente da aula vê também as não publicadas');
reset role;

select testes.entrar('coord');
select results_eq($$ select count(*)::int from public.tarefas where id = testes.id('tar_rascunho') $$,
  $$ values (1) $$, 'coordenação vê tarefas não publicadas');
reset role;

-- INSERT -------------------------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ insert into public.tarefas (aula_id, titulo, tipo_avaliacao, opcoes_conceito)
     values (testes.id('aula_passada'), 'Redação 2', 'conceito', array['Satisfatório', 'Precisa revisar'])
     returning publicada $$,
  $$ values (false) $$, 'docente cria tarefa, que nasce não publicada');
select throws_ok(
  $$ insert into public.tarefas (aula_id, titulo, tipo_avaliacao) values (testes.id('aula_passada'), 'Sem opções', 'conceito') $$,
  '23514', null, 'tarefa de conceito exige opções');
select throws_ok(
  $$ insert into public.tarefas (aula_id, titulo, tipo_avaliacao, opcoes_conceito)
     values (testes.id('aula_passada'), 'Opções vazias', 'conceito', '{}') $$,
  '23514', null, 'tarefa de conceito não aceita lista vazia');
reset role;

select testes.entrar('prof2');
select throws_ok($$ insert into public.tarefas (aula_id, titulo) values (testes.id('aula_passada'), 'X') $$,
  '42501', null, 'outra docente não cria tarefa na aula');
reset role;

select testes.entrar('coord');
select throws_ok($$ insert into public.tarefas (aula_id, titulo) values (testes.id('aula_passada'), 'X') $$,
  '42501', null, 'coordenação não cria tarefa');
select is_empty($$ update public.tarefas set publicada = true where id = testes.id('tar_rascunho') returning id $$,
  'coordenação não publica tarefa');
reset role;

select testes.entrar('est');
select throws_ok($$ insert into public.tarefas (aula_id, titulo) values (testes.id('aula_passada'), 'X') $$,
  '42501', null, 'estudante não cria tarefa');
reset role;

-- UPDATE / DELETE ----------------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ update public.tarefas set publicada = true where id = testes.id('tar_rascunho') returning publicada $$,
  $$ values (true) $$, 'docente publica a tarefa');
reset role;

select testes.entrar('est');
select is_empty($$ delete from public.tarefas where id = testes.id('tar_nota') returning id $$, 'estudante não exclui tarefa');
reset role;

select testes.entrar('coord');
select results_eq($$ delete from public.tarefas where id = testes.id('tar_devolutiva') returning id $$,
  $$ values (testes.id('tar_devolutiva')) $$, 'coordenação exclui tarefa (moderação)');
reset role;

select * from finish();
rollback;
