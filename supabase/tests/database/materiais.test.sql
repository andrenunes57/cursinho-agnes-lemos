-- materiais: rascunho x publicado, escrita só da docente da aula, moderação da coordenação
-- (SPEC §7.2, §9.3, RF-11–RF-13, ADR-06)
begin;
\ir _fixtures.psql
select plan(22);

select testes.entrar_anon();
select throws_ok($$ select * from public.materiais $$, '42501', null, 'anon não lê materiais');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select set_eq($$ select id from public.materiais $$, array[testes.id('mat_publicado'), testes.id('mat_arquivo')],
  'estudante vê só os materiais publicados da turma');
reset role;

select testes.entrar('est2');
select is_empty($$ select id from public.materiais $$, 'estudante de outra turma não vê os materiais');
reset role;

select testes.entrar('inat');
select is_empty($$ select id from public.materiais $$, 'inativa não vê materiais');
reset role;

select testes.entrar('prof');
select set_eq($$ select id from public.materiais $$,
  array[testes.id('mat_rascunho'), testes.id('mat_publicado'), testes.id('mat_arquivo')],
  'docente da aula vê também os rascunhos');
reset role;

select testes.entrar('prof2');
select is_empty($$ select id from public.materiais $$, 'outra docente não vê materiais da aula');
reset role;

select testes.entrar('coord');
select set_eq($$ select id from public.materiais where aula_id = testes.id('aula_passada') $$,
  array[testes.id('mat_rascunho'), testes.id('mat_publicado'), testes.id('mat_arquivo')],
  'coordenação vê todos os materiais');
reset role;

-- INSERT -------------------------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ insert into public.materiais (aula_id, tipo, titulo, url)
     values (testes.id('aula_passada'), 'video', 'Vídeo', 'https://youtu.be/abc')
     returning publicado $$,
  $$ values (false) $$, 'docente cria material, que nasce como rascunho');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo) values (testes.id('aula_passada'), 'texto', 'Sem texto') $$,
  '23514', null, 'material do tipo texto exige conteúdo');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo) values (testes.id('aula_passada'), 'arquivo', 'Sem arquivo') $$,
  '23514', null, 'material do tipo arquivo exige arquivo_id');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, arquivo_id)
     values (testes.id('aula_passada'), 'arquivo', 'Arquivo alheio', testes.id('arq_solto')) $$,
  '42501', null, 'docente não anexa arquivo de outra pessoa');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, arquivo_id)
     values (testes.id('aula_passada'), 'arquivo', 'Arquivo de entrega', testes.id('arq_ent')) $$,
  '42501', null, 'docente não anexa arquivo de entrega como material');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, conteudo) values (testes.id('aula_b'), 'texto', 'X', 'Y') $$,
  '42501', null, 'docente não cria material em aula de outra pessoa');
reset role;

select testes.entrar('coord');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, conteudo) values (testes.id('aula_passada'), 'texto', 'X', 'Y') $$,
  '42501', null, 'coordenação não cria material (só modera)');
select is_empty($$ update public.materiais set publicado = false where id = testes.id('mat_publicado') returning id $$,
  'coordenação não edita material');
reset role;

select testes.entrar('est');
select throws_ok(
  $$ insert into public.materiais (aula_id, tipo, titulo, conteudo) values (testes.id('aula_passada'), 'texto', 'X', 'Y') $$,
  '42501', null, 'estudante não cria material');
reset role;

-- UPDATE (publicar) --------------------------------------------------------------------------------
select testes.entrar('prof');
select results_eq(
  $$ update public.materiais set publicado = true where id = testes.id('mat_rascunho') returning publicado $$,
  $$ values (true) $$, 'docente publica o rascunho');
reset role;

-- Substituição (ADR-06): a coordenação reatribui a aula; quem substitui edita material com arquivo
-- enviado pela docente anterior, e a docente anterior perde o acesso.
update public.aulas set professor_id = testes.id('prof2') where id = testes.id('aula_passada');
select testes.entrar('prof2');
select results_eq(
  $$ update public.materiais set titulo = 'Lista 1 (revisada)' where id = testes.id('mat_arquivo') returning titulo $$,
  $$ values ('Lista 1 (revisada)'::text) $$, 'quem substitui edita material com arquivo da docente anterior');
reset role;
select testes.entrar('prof');
select is_empty($$ select id from public.materiais $$, 'docente anterior deixa de ver os materiais da aula');
reset role;
update public.aulas set professor_id = testes.id('prof') where id = testes.id('aula_passada');

-- DELETE -------------------------------------------------------------------------------------------
select testes.entrar('est');
select is_empty($$ delete from public.materiais where id = testes.id('mat_publicado') returning id $$,
  'estudante não exclui material');
reset role;

select testes.entrar('coord');
select results_eq($$ delete from public.materiais where id = testes.id('mat_publicado') returning id $$,
  $$ values (testes.id('mat_publicado')) $$, 'coordenação exclui material (moderação)');
reset role;

select testes.entrar('prof');
select results_eq($$ delete from public.materiais where id = testes.id('mat_rascunho') returning id $$,
  $$ values (testes.id('mat_rascunho')) $$, 'docente exclui material da própria aula');
reset role;

select * from finish();
rollback;
