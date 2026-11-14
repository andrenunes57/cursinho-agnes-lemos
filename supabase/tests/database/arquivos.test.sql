-- arquivos: metadados visíveis só a quem vê o registro que os referencia (SPEC §9.3, §10.3)
begin;
\ir _fixtures.psql
select plan(18);

select testes.entrar_anon();
select throws_ok($$ select * from public.arquivos $$, '42501', null, 'anon não lê arquivos');
reset role;

-- SELECT -------------------------------------------------------------------------------------------
select testes.entrar('est');
select set_eq($$ select id from public.arquivos $$, array[testes.id('arq_ent'), testes.id('arq_mat')],
  'estudante vê os próprios arquivos e os de materiais publicados da turma');
reset role;

select testes.entrar('est2');
select set_eq($$ select id from public.arquivos $$, array[testes.id('arq_ent2')],
  'outra estudante não vê arquivos da Turma A');
reset role;

select testes.entrar('prof');
select set_eq($$ select id from public.arquivos $$, array[testes.id('arq_mat'), testes.id('arq_ent')],
  'docente vê os próprios arquivos e os das entregas das próprias tarefas');
reset role;

select testes.entrar('prof2');
select set_eq($$ select id from public.arquivos $$, array[testes.id('arq_solto')],
  'outra docente vê só o próprio arquivo');
reset role;

select testes.entrar('pend');
select is_empty($$ select id from public.arquivos $$, 'pendente não vê arquivos');
reset role;

select testes.entrar('coord');
select results_eq($$ select count(*)::int from public.arquivos $$, $$ values (4) $$, 'coordenação vê todos os arquivos');
reset role;

-- Rascunho não expõe o arquivo à estudante.
update public.materiais set publicado = false where id = testes.id('mat_arquivo');
select testes.entrar('est');
select set_eq($$ select id from public.arquivos $$, array[testes.id('arq_ent')],
  'arquivo de material em rascunho fica invisível para estudante');
reset role;

-- INSERT (feito pela API de Arquivos com o JWT da pessoa) --------------------------------------------
select testes.entrar('est');
select results_eq(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento)
     values ('drive-novo', 'foto.jpg', 'image/jpeg', 10, 'https://drive.google.com/file/d/drive-novo/view', 'entrega', 'drive-01')
     returning enviado_por $$,
  $$ values (testes.id('est')) $$, 'estudante registra arquivo de entrega (enviado_por = auth.uid())');
select throws_ok(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento)
     values ('drive-x', 'a.pdf', 'application/pdf', 10, 'u', 'material', 'drive-01') $$,
  '42501', null, 'estudante não registra arquivo de material');
select throws_ok(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento, enviado_por)
     values ('drive-y', 'a.pdf', 'application/pdf', 10, 'u', 'entrega', 'drive-01', testes.id('est2')) $$,
  '42501', null, 'ninguém registra arquivo em nome de outra pessoa');
select throws_ok(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento)
     values ('drive-z', 'a.pdf', 'application/pdf', 0, 'u', 'entrega', 'drive-01') $$,
  '23514', null, 'tamanho precisa ser positivo');
select throws_ok($$ update public.arquivos set nome = 'x' where id = testes.id('arq_ent') $$,
  '42501', null, 'metadados de arquivo não são editados');
reset role;

select testes.entrar('prof');
select results_eq(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento)
     values ('drive-prof', 'b.pdf', 'application/pdf', 10, 'u', 'material', 'drive-01') returning finalidade::text $$,
  $$ values ('material'::text) $$, 'docente registra arquivo de material');
reset role;

select testes.entrar('pend');
select throws_ok(
  $$ insert into public.arquivos (drive_file_id, nome, mime_type, tamanho_bytes, url_visualizacao, finalidade, conta_armazenamento)
     values ('drive-pend', 'a.pdf', 'application/pdf', 10, 'u', 'entrega', 'drive-01') $$,
  '42501', null, 'pendente não registra arquivo');
reset role;

-- DELETE -------------------------------------------------------------------------------------------
select testes.entrar('prof');
select is_empty($$ delete from public.arquivos where id = testes.id('arq_ent') returning id $$,
  'docente não exclui arquivo de outra pessoa');
reset role;

select testes.entrar('prof2');
select results_eq($$ delete from public.arquivos where id = testes.id('arq_solto') returning id $$,
  $$ values (testes.id('arq_solto')) $$, 'quem enviou exclui o próprio arquivo sem uso');
reset role;

select testes.entrar('coord');
select throws_ok($$ delete from public.arquivos where id = testes.id('arq_mat') $$,
  '23503', null, 'arquivo ainda referenciado não é excluído (FK restrict → EM_USO)');
reset role;

select * from finish();
rollback;
