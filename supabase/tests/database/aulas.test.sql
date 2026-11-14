-- aulas: agenda por papel, criação por docente (para si) e pela coordenação, reatribuição
-- (SPEC §7.2, §9.3, RF-09, RF-10, ADR-06)
begin;
\ir _fixtures.psql
select plan(23);

select testes.entrar_anon();
select throws_ok($$ select * from public.aulas $$, '42501', null, 'anon não lê aulas');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select set_eq($$ select id from public.aulas $$, array[testes.id('aula_passada'), testes.id('aula_futura')],
  'estudante vê as aulas da própria turma');
reset role;

select testes.entrar('est2');
select set_eq($$ select id from public.aulas $$, array[testes.id('aula_b')], 'outra estudante vê só a turma dela');
reset role;

select testes.entrar('inat');
select is_empty($$ select id from public.aulas $$, 'inativa não vê aulas');
reset role;

select testes.entrar('pend');
select is_empty($$ select id from public.aulas $$, 'pendente não vê aulas');
reset role;

select testes.entrar('prof2');
select set_eq($$ select id from public.aulas $$, array[testes.id('aula_b')], 'docente vê só as turmas onde leciona');
reset role;

select testes.entrar('coord');
select set_eq(
  $$ select id from public.aulas where turma_id in (testes.id('turma_a'), testes.id('turma_b')) $$,
  array[testes.id('aula_passada'), testes.id('aula_futura'), testes.id('aula_b')],
  'coordenação vê todas as aulas');
reset role;

-- INSERT -------------------------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'Nova aula')
     returning titulo, criado_por $$,
  $$ values ('Nova aula'::text, testes.id('prof')) $$,
  'docente cria aula para si (criado_por = auth.uid())');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('prof2'), testes.hoje(), 'Para outra pessoa') $$,
  '42501', null, 'docente não cria aula para outra pessoa');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_inativa'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'Turma encerrada') $$,
  '42501', null, 'docente não cria aula em turma inativa (RF-10)');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'X') $$,
  '23514', null, 'título com menos de 2 caracteres é recusado');
reset role;

select testes.entrar('est');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'Aula da estudante') $$,
  '42501', null, 'estudante não cria aula (nem em nome de uma docente)');
reset role;

select testes.entrar('coord');
select results_eq(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_b'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'Aula do cronograma')
     returning professor_id $$,
  $$ values (testes.id('prof')) $$, 'coordenação cria aula para qualquer docente');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('est'), testes.hoje(), 'Responsável inválida') $$,
  '23514', null, 'trigger: responsável precisa ser docente ou coordenação');
select throws_ok(
  $$ insert into public.aulas (turma_id, disciplina_id, professor_id, data, titulo)
     values (testes.id('turma_a'), testes.id('disciplina'), testes.id('pend'), testes.hoje(), 'Responsável pendente') $$,
  '23514', null, 'trigger: responsável precisa estar ativa');
reset role;

-- UPDATE / reatribuição ----------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ update public.aulas set titulo = 'Funções' where id = testes.id('aula_futura') returning titulo $$,
  $$ values ('Funções'::text) $$, 'docente edita a própria aula');
select throws_ok(
  $$ update public.aulas set professor_id = testes.id('prof2') where id = testes.id('aula_futura') $$,
  '42501', null, 'docente não reatribui a própria aula');
reset role;

select testes.entrar('prof2');
select is_empty($$ update public.aulas set titulo = 'Invasão' where id = testes.id('aula_futura') returning id $$,
  'docente não edita aula de outra pessoa');
select is_empty($$ delete from public.aulas where id = testes.id('aula_futura') returning id $$,
  'docente não exclui aula de outra pessoa');
reset role;

select testes.entrar('coord');
select results_eq(
  $$ update public.aulas set professor_id = testes.id('prof2') where id = testes.id('aula_futura') returning professor_id $$,
  $$ values (testes.id('prof2')) $$, 'coordenação reatribui a docente (ADR-06)');
reset role;

-- Docente desligada não edita mais as próprias aulas.
update public.perfis set status = 'inativo' where id = testes.id('prof');
select testes.entrar('prof');
select is_empty($$ update public.aulas set titulo = 'Depois' where id = testes.id('aula_passada') returning id $$,
  'docente inativa não edita aulas');
reset role;
update public.perfis set status = 'ativo' where id = testes.id('prof');

-- DELETE -------------------------------------------------------------------------------------------
select testes.entrar('est');
select is_empty($$ delete from public.aulas where id = testes.id('aula_passada') returning id $$,
  'estudante não exclui aula');
reset role;

select testes.entrar('prof');
select results_eq($$ delete from public.aulas where id = testes.id('aula_passada') returning id $$,
  $$ values (testes.id('aula_passada')) $$, 'docente exclui a própria aula (cascata em materiais etc.)');
reset role;

select * from finish();
rollback;
