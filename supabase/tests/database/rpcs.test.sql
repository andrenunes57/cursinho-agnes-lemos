-- RPCs (SPEC §9.4, §14.1): entregas, avaliação, chamada, frequência, pessoas, equipe e ping
begin;
\ir _fixtures.psql
select plan(72);

-- ===================================================================================================
-- enviar_entrega
-- ===================================================================================================
select testes.entrar('est');
select results_eq(
  $$ select tarefa_id, link, avaliada_em from public.enviar_entrega(testes.id('tar_conceito'), null, 'https://exemplo.invalid/doc', null) $$,
  $$ values (testes.id('tar_conceito'), 'https://exemplo.invalid/doc'::text, null::timestamptz) $$,
  'estudante envia entrega com link');
select results_eq(
  $$ select arquivo_id, comentario from public.enviar_entrega(testes.id('tar_nota'), null, null, '  Nova versão  ') $$,
  $$ values (null::uuid, 'Nova versão'::text) $$,
  'reenvio substitui a entrega anterior (antes da avaliação)');
select results_eq(
  $$ select count(*)::int from public.entregas where tarefa_id = testes.id('tar_nota') $$,
  $$ values (1) $$, 'reenvio não duplica a entrega');
select lives_ok(
  $$ select public.enviar_entrega(testes.id('tar_devolutiva'), testes.id('arq_ent'), null, null) $$,
  'estudante envia entrega com o próprio arquivo de entrega');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_rascunho'), null, null, 'Oi') $$,
  'P0001', 'Esta tarefa ainda não foi publicada.', 'tarefa não publicada é recusada');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_b'), null, null, 'Oi') $$,
  '42501', null, 'tarefa de outra turma é recusada');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_conceito'), testes.id('arq_ent2'), null, null) $$,
  '42501', null, 'arquivo de outra pessoa é recusado');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_conceito'), testes.id('arq_mat'), null, null) $$,
  '42501', null, 'arquivo que não é de entrega é recusado');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_conceito'), null, '  ', '') $$,
  'P0001', 'Envie um arquivo, um link ou um comentário.', 'entrega vazia é recusada');
select throws_ok($$ select public.enviar_entrega(gen_random_uuid(), null, null, 'Oi') $$,
  'P0001', 'Tarefa não encontrada.', 'tarefa inexistente');
reset role;

select testes.entrar('est2');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_nota'), null, null, 'Oi') $$,
  '42501', null, 'estudante de outra turma não envia');
reset role;
select testes.entrar('inat');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_nota'), null, null, 'Oi') $$,
  '42501', null, 'estudante inativa não envia');
reset role;
select testes.entrar('prof');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_nota'), null, null, 'Oi') $$,
  '42501', null, 'docente não envia entrega');
reset role;

-- ===================================================================================================
-- avaliar_entrega
-- ===================================================================================================
select testes.entrar('prof');
-- nota
select results_eq(
  $$ select nota, devolutiva, avaliada_por, avaliada_em is not null
       from public.avaliar_entrega(testes.id('ent_est'), 8.5, null, 'Bom trabalho') $$,
  $$ values (8.5::numeric, 'Bom trabalho'::text, testes.id('prof'), true) $$,
  'avalia por nota com devolutiva');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), 11, null, null) $$,
  'P0001', 'A nota precisa estar entre 0 e 10.', 'nota acima de 10 é recusada');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), null, null, 'Só texto') $$,
  'P0001', 'A nota precisa estar entre 0 e 10.', 'tarefa de nota exige nota');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), 7, 'Satisfatório', null) $$,
  'P0001', null, 'tarefa de nota não aceita conceito');
select results_eq(
  $$ select nota, devolutiva from public.avaliar_entrega(testes.id('ent_est'), 9, null, 'Revisado') $$,
  $$ values (9.0::numeric, 'Revisado'::text) $$, 'docente reavalia');
-- conceito
select results_eq(
  $$ select conceito, nota from public.avaliar_entrega(
       (select id from public.entregas where tarefa_id = testes.id('tar_conceito')), null, 'Satisfatório', null) $$,
  $$ values ('Satisfatório'::text, null::numeric) $$, 'avalia por conceito da lista');
select throws_ok(
  $$ select public.avaliar_entrega((select id from public.entregas where tarefa_id = testes.id('tar_conceito')), null, 'Ótimo', null) $$,
  'P0001', 'Escolha um dos conceitos definidos na tarefa.', 'conceito fora da lista é recusado');
select throws_ok(
  $$ select public.avaliar_entrega((select id from public.entregas where tarefa_id = testes.id('tar_conceito')), 5, 'Satisfatório', null) $$,
  'P0001', null, 'tarefa de conceito não aceita nota');
-- devolutiva
select throws_ok(
  $$ select public.avaliar_entrega((select id from public.entregas where tarefa_id = testes.id('tar_devolutiva')), null, null, '   ') $$,
  'P0001', 'Escreva a devolutiva.', 'tarefa de devolutiva exige texto');
select throws_ok(
  $$ select public.avaliar_entrega((select id from public.entregas where tarefa_id = testes.id('tar_devolutiva')), 5, null, 'Texto') $$,
  'P0001', null, 'tarefa de devolutiva não aceita nota');
select results_eq(
  $$ select devolutiva, nota, conceito from public.avaliar_entrega(
       (select id from public.entregas where tarefa_id = testes.id('tar_devolutiva')), null, null, 'Muito bom') $$,
  $$ values ('Muito bom'::text, null::numeric, null::text) $$, 'avalia só com devolutiva');
reset role;

select testes.entrar('prof2');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), 5, null, null) $$,
  '42501', null, 'outra docente não avalia');
reset role;
select testes.entrar('coord');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), 5, null, null) $$,
  '42501', null, 'coordenação não avalia');
reset role;
select testes.entrar('est');
select throws_ok($$ select public.avaliar_entrega(testes.id('ent_est'), 10, null, null) $$,
  '42501', null, 'estudante não se avalia');
select throws_ok($$ select public.enviar_entrega(testes.id('tar_nota'), null, null, 'Mais uma') $$,
  'P0001', 'Esta entrega já foi avaliada e não pode mais ser reenviada.', 'reenvio após a avaliação é recusado');
select results_eq(
  $$ select nota, devolutiva from public.entregas where tarefa_id = testes.id('tar_nota') $$,
  $$ values (9.0::numeric, 'Revisado'::text) $$, 'estudante vê a nota e a devolutiva');
reset role;

-- ===================================================================================================
-- registrar_chamada
-- ===================================================================================================
select testes.entrar('prof');
select results_eq(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'),
       jsonb_build_object('estudante_id', testes.id('inat'), 'status', 'ausente'))) $$,
  $$ values (2) $$, 'docente da aula registra a chamada em lote');
select results_eq(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'justificada'))) $$,
  $$ values (1) $$, 'docente corrige a chamada');
select results_eq(
  $$ select status::text, registrado_por from public.presencas
      where aula_id = testes.id('aula_passada') and estudante_id = testes.id('est') $$,
  $$ values ('justificada'::text, testes.id('prof')) $$, 'correção gravada com registrado_por');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_futura'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  'P0001', 'Não é possível fazer a chamada de uma aula com data futura.', 'aula futura é recusada');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est2'), 'status', 'presente'))) $$,
  'P0001', 'Há pessoa estudante sem matrícula na turma desta aula.', 'estudante de outra turma é recusada');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'faltou'))) $$,
  'P0001', null, 'status inválido é recusado');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'),
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'ausente'))) $$,
  'P0001', 'A lista repete a mesma pessoa estudante.', 'estudante repetida é recusada');
select throws_ok($$ select public.registrar_chamada(testes.id('aula_passada'), '[]'::jsonb) $$,
  'P0001', null, 'lista vazia é recusada');
reset role;

select testes.entrar('prof2');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  '42501', null, 'outra docente não faz a chamada');
reset role;
select testes.entrar('coord');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  '42501', null, 'coordenação que não é docente da aula não faz a chamada');
reset role;
select testes.entrar('est');
select throws_ok(
  $$ select public.registrar_chamada(testes.id('aula_passada'), jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  '42501', null, 'estudante não faz a chamada');
reset role;

-- Aula de hoje é permitida; coordenação que dá a aula faz a própria chamada (ADR-06).
insert into public.aulas (id, turma_id, disciplina_id, professor_id, data, titulo) values
  ('1a000000-0000-4000-8000-000000000020', testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje(), 'Aula de hoje'),
  ('1a000000-0000-4000-8000-000000000021', testes.id('turma_a'), testes.id('disciplina'), testes.id('coord'), testes.hoje() - 1, 'Aula da coordenação');
select testes.entrar('prof');
select results_eq(
  $$ select public.registrar_chamada('1a000000-0000-4000-8000-000000000020', jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  $$ values (1) $$, 'chamada da aula de hoje é aceita');
reset role;
select testes.entrar('coord');
select results_eq(
  $$ select public.registrar_chamada('1a000000-0000-4000-8000-000000000021', jsonb_build_array(
       jsonb_build_object('estudante_id', testes.id('est'), 'status', 'presente'))) $$,
  $$ values (1) $$, 'coordenação faz a chamada da aula que ela mesma dá');
reset role;
delete from public.aulas where id in ('1a000000-0000-4000-8000-000000000020', '1a000000-0000-4000-8000-000000000021');

-- ===================================================================================================
-- estudantes_da_turma, equipe, ping
-- ===================================================================================================
select testes.entrar('prof');
select results_eq($$ select id, nome_social from public.estudantes_da_turma(testes.id('turma_a')) $$,
  $$ values (testes.id('est'), 'Est Teste'::text) $$, 'docente vê as estudantes ativas da turma (sem e-mail)');
reset role;
select testes.entrar('prof2');
select throws_ok($$ select * from public.estudantes_da_turma(testes.id('turma_a')) $$,
  '42501', null, 'docente que não leciona na turma não vê as estudantes');
reset role;
select testes.entrar('est');
select throws_ok($$ select * from public.estudantes_da_turma(testes.id('turma_a')) $$,
  '42501', null, 'estudante não vê a lista de estudantes');
select set_eq($$ select id from public.equipe() $$,
  array[testes.id('coord'), testes.id('prof'), testes.id('prof2')], 'estudante vê a equipe (docentes e coordenação)');
reset role;
select testes.entrar('coord');
select results_eq($$ select id from public.estudantes_da_turma(testes.id('turma_a')) $$,
  $$ values (testes.id('est')) $$, 'coordenação vê as estudantes da turma');
reset role;
select testes.entrar('pend');
select throws_ok($$ select * from public.equipe() $$, '42501', null, 'pendente não vê a equipe');
reset role;
select testes.entrar_anon();
select throws_ok($$ select * from public.equipe() $$, '42501', null, 'anon não executa outras RPCs');
select results_eq($$ select public.ping() $$, $$ values ('ok'::text) $$, 'anon chama ping');
reset role;
select testes.entrar('est');
select results_eq($$ select public.ping() $$, $$ values ('ok'::text) $$, 'authenticated chama ping');
reset role;

-- ===================================================================================================
-- frequencia — % = presentes ÷ aulas com chamada da pessoa; justificada conta como não presença;
-- matrícula no meio do período não penaliza.
-- ===================================================================================================
insert into auth.users (id, email, aud, role) values
  ('99999999-0000-4000-8000-000000000003', 'novo@teste.local', 'authenticated', 'authenticated');
update public.perfis set nome_social = 'Novo Teste', status = 'ativo'
 where id = '99999999-0000-4000-8000-000000000003';
insert into public.matriculas (estudante_id, turma_id) values ('99999999-0000-4000-8000-000000000003', testes.id('turma_a'));
insert into public.aulas (id, turma_id, disciplina_id, professor_id, data, titulo) values
  ('1a000000-0000-4000-8000-000000000010', testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje() - 2, 'X1'),
  ('1a000000-0000-4000-8000-000000000011', testes.id('turma_a'), testes.id('disciplina'), testes.id('prof'), testes.hoje() - 3, 'X2'),
  ('1a000000-0000-4000-8000-000000000012', testes.id('turma_a'), testes.id('disciplina'), testes.id('prof2'), testes.hoje() - 10, 'X3');
delete from public.presencas where aula_id = testes.id('aula_passada');
insert into public.presencas (aula_id, estudante_id, status, registrado_por) values
  (testes.id('aula_passada'), testes.id('est'), 'presente', testes.id('prof')),
  (testes.id('aula_passada'), '99999999-0000-4000-8000-000000000003', 'presente', testes.id('prof')),
  ('1a000000-0000-4000-8000-000000000010', testes.id('est'), 'ausente', testes.id('prof')),
  ('1a000000-0000-4000-8000-000000000010', testes.id('inat'), 'presente', testes.id('prof')),
  ('1a000000-0000-4000-8000-000000000011', testes.id('est'), 'justificada', testes.id('prof')),
  ('1a000000-0000-4000-8000-000000000012', testes.id('est'), 'presente', testes.id('prof2'));

select testes.entrar('coord');
select results_eq(
  $$ select nome_social, aulas_com_chamada, presentes, ausentes, justificadas, percentual
       from public.frequencia(testes.id('turma_a')) $$,
  $$ values ('Est Teste'::text, 4, 2, 1, 1, 50.0::numeric),
            ('Inat Teste'::text, 1, 1, 0, 0, 100.0::numeric),
            ('Novo Teste'::text, 1, 1, 0, 0, 100.0::numeric) $$,
  'coordenação: todas as aulas; justificada não conta como presença; matrícula tardia não penaliza');
select results_eq(
  $$ select nome_social, aulas_com_chamada, presentes, percentual
       from public.frequencia(testes.id('turma_a'), testes.hoje() - 3, testes.hoje() - 2) $$,
  $$ values ('Est Teste'::text, 2, 0, 0.0::numeric),
            ('Inat Teste'::text, 1, 1, 100.0::numeric),
            ('Novo Teste'::text, 0, 0, null::numeric) $$,
  'filtro por período; sem chamada no período → % nulo');
reset role;

select testes.entrar('prof');
select results_eq(
  $$ select nome_social, aulas_com_chamada, presentes, ausentes, justificadas, percentual
       from public.frequencia(testes.id('turma_a')) $$,
  $$ values ('Est Teste'::text, 3, 1, 1, 1, 33.3::numeric),
            ('Inat Teste'::text, 1, 1, 0, 0, 100.0::numeric),
            ('Novo Teste'::text, 1, 1, 0, 0, 100.0::numeric) $$,
  'docente: só as próprias aulas');
reset role;

select testes.entrar('prof2');
select results_eq(
  $$ select nome_social, aulas_com_chamada, percentual from public.frequencia(testes.id('turma_a')) $$,
  $$ values ('Est Teste'::text, 1, 100.0::numeric),
            ('Inat Teste'::text, 0, null::numeric),
            ('Novo Teste'::text, 0, null::numeric) $$,
  'outra docente da turma: só as aulas dela');
reset role;

select testes.entrar('est');
select results_eq(
  $$ select estudante_id, aulas_com_chamada, presentes, percentual from public.frequencia(testes.id('turma_a')) $$,
  $$ values (testes.id('est'), 4, 2, 50.0::numeric) $$,
  'estudante: só a própria linha');
reset role;

select testes.entrar('est2');
select throws_ok($$ select * from public.frequencia(testes.id('turma_a')) $$,
  '42501', null, 'estudante de outra turma não vê a frequência');
reset role;
select testes.entrar('pend');
select throws_ok($$ select * from public.frequencia(testes.id('turma_a')) $$,
  '42501', null, 'pendente não vê a frequência');
reset role;

-- ===================================================================================================
-- aprovar_cadastros, definir_papel, definir_status
-- ===================================================================================================
select testes.entrar('est');
select throws_ok($$ select public.aprovar_cadastros(array[testes.id('pend')]) $$,
  '42501', null, 'estudante não aprova cadastros');
reset role;

insert into auth.users (id, email, aud, role) values
  ('99999999-0000-4000-8000-000000000004', 'docente.nova@teste.local', 'authenticated', 'authenticated');

select testes.entrar('coord');
select results_eq(
  $$ select public.aprovar_cadastros(array[testes.id('pend'), testes.id('est')], 'estudante', testes.id('turma_b')) $$,
  $$ values (1) $$, 'coordenação aprova em lote (só quem está pendente conta)');
select results_eq(
  $$ select p.status::text, p.papel::text,
            exists (select 1 from public.matriculas m where m.estudante_id = p.id and m.turma_id = testes.id('turma_b'))
       from public.perfis p where p.id = testes.id('pend') $$,
  $$ values ('ativo'::text, 'estudante'::text, true) $$, 'aprovada como estudante e matriculada na turma');
select results_eq($$ select public.aprovar_cadastros(array[testes.id('pend')]) $$, $$ values (0) $$,
  'aprovar de novo não faz nada');
select results_eq(
  $$ select public.aprovar_cadastros(array['99999999-0000-4000-8000-000000000004'::uuid], 'professor', testes.id('turma_a')) $$,
  $$ values (1) $$, 'coordenação aprova docente');
select results_eq(
  $$ select p.papel::text, exists (select 1 from public.matriculas m where m.estudante_id = p.id)
       from public.perfis p where p.id = '99999999-0000-4000-8000-000000000004' $$,
  $$ values ('professor'::text, false) $$, 'docente aprovada não ganha matrícula');
select throws_ok($$ select public.aprovar_cadastros(array[testes.id('pend')], 'estudante', gen_random_uuid()) $$,
  'P0001', 'Turma não encontrada.', 'turma inexistente é recusada');
select throws_ok($$ select public.definir_papel(testes.id('coord'), 'professor') $$,
  'P0001', 'Não é possível deixar a coordenação sem nenhuma pessoa ativa.',
  'a última pessoa da coordenação não perde o papel');
select throws_ok($$ select public.definir_status(testes.id('coord'), 'inativo') $$,
  'P0001', 'Não é possível deixar a coordenação sem nenhuma pessoa ativa.',
  'a última pessoa da coordenação não é desativada');
select throws_ok($$ select public.definir_papel(gen_random_uuid(), 'professor') $$,
  'P0001', 'Pessoa não encontrada.', 'pessoa inexistente');
select lives_ok($$ select public.definir_status(testes.id('est'), 'inativo') $$, 'coordenação desativa estudante');
select lives_ok($$ select public.definir_papel(testes.id('prof'), 'coordenacao') $$, 'coordenação promove docente');
select lives_ok($$ select public.definir_papel(testes.id('coord'), 'professor') $$,
  'com outra pessoa na coordenação, a anterior pode deixar o papel');
reset role;

select testes.entrar('prof2');
select throws_ok($$ select public.definir_papel(testes.id('prof2'), 'coordenacao') $$,
  '42501', null, 'docente não altera papéis (nem o próprio)');
reset role;

select * from finish();
rollback;
