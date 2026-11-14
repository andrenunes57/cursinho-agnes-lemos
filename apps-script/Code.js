/**
 * API de Arquivos do Cursinho Agnes Lemos (SPEC §10).
 *
 * Web App (executa como a conta dona, acesso anônimo). O navegador manda um POST com
 * Content-Type text/plain (sem preflight de CORS) e corpo JSON. A resposta é sempre HTTP 200
 * com { ok: true, ... } ou { ok: false, erro, mensagem } (§10.2).
 *
 * Segurança: toda escrita no banco usa o JWT da própria pessoa e a RLS decide. Este script só
 * conhece a chave *publishable* do Supabase (nunca a secret key).
 *
 * Script Properties: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, PASTA_RAIZ_ID, MAX_BYTES, CONTA_ID.
 */

var FUSO = 'America/Sao_Paulo';

// Allowlist de MIME (§10.4). Vídeo não é aceito: vai como link do YouTube.
var TIPOS_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'text/plain',
];

var FINALIDADES = ['material', 'entrega'];

var MENSAGENS = {
  REQUISICAO_INVALIDA: 'Requisição inválida.',
  TOKEN_INVALIDO: 'Sua sessão expirou. Entre de novo.',
  ARQUIVO_GRANDE: 'O arquivo passa do limite de tamanho.',
  TIPO_NAO_PERMITIDO: 'Este tipo de arquivo não é aceito.',
  SEM_PERMISSAO: 'Você não tem permissão para fazer isso.',
  NAO_ENCONTRADO: 'Arquivo não encontrado.',
  EM_USO: 'O arquivo ainda está em uso por um material ou uma entrega.',
  ERRO_DRIVE: 'Não foi possível gravar no Google Drive.',
  ERRO_INTERNO: 'Erro inesperado na API de Arquivos.',
};

var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Erro com código do protocolo (§10.2). */
class Falha extends Error {
  constructor(codigo, detalhe) {
    super(codigo + (detalhe ? ': ' + detalhe : ''));
    this.codigo = codigo;
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Ponto de entrada do Web App (chamado pelo Apps Script, não por este arquivo).
// oxlint-disable-next-line no-unused-vars
function doPost(e) {
  try {
    var corpo;
    try {
      corpo = JSON.parse((e && e.postData && e.postData.contents) || '');
    } catch {
      throw new Falha('REQUISICAO_INVALIDA', 'JSON malformado');
    }
    if (!corpo || typeof corpo !== 'object') throw new Falha('REQUISICAO_INVALIDA', 'corpo vazio');

    var acoes = { upload: upload, delete: excluir, status: status };
    var acao = acoes[corpo.action];
    if (typeof corpo.action !== 'string' || !Object.prototype.hasOwnProperty.call(acoes, corpo.action)) {
      throw new Falha('REQUISICAO_INVALIDA', 'action desconhecida');
    }
    return responder(acao(corpo, lerConfig()));
  } catch (erro) {
    if (erro instanceof Falha) {
      return responder({ ok: false, erro: erro.codigo, mensagem: MENSAGENS[erro.codigo] });
    }
    console.error('ERRO_INTERNO', erro && erro.stack ? erro.stack : erro);
    return responder({ ok: false, erro: 'ERRO_INTERNO', mensagem: MENSAGENS.ERRO_INTERNO });
  }
}

function lerConfig() {
  var p = PropertiesService.getScriptProperties().getProperties();
  var maxBytes = Number(p.MAX_BYTES);
  if (!p.SUPABASE_URL || !p.SUPABASE_PUBLISHABLE_KEY || !p.PASTA_RAIZ_ID || !p.CONTA_ID || !(maxBytes > 0)) {
    throw new Error('Script Properties incompletas (SPEC §10.1).');
  }
  if (p.SUPABASE_PUBLISHABLE_KEY.indexOf('sb_secret_') === 0) {
    throw new Error('A secret key do Supabase nunca pode ficar no Apps Script (SPEC §10.1).');
  }
  return {
    url: p.SUPABASE_URL.replace(/\/+$/, ''),
    chave: p.SUPABASE_PUBLISHABLE_KEY,
    pastaRaizId: p.PASTA_RAIZ_ID,
    maxBytes: maxBytes,
    conta: p.CONTA_ID,
  };
}

// ---------------------------------------------------------------------------
// Supabase (sempre com o JWT da pessoa)
// ---------------------------------------------------------------------------
function chamarSupabase(config, jwt, metodo, caminho, payload, extras) {
  var headers = { apikey: config.chave, Authorization: 'Bearer ' + jwt };
  if (extras) {
    for (var k in extras) headers[k] = extras[k];
  }
  var params = { method: metodo, headers: headers, muteHttpExceptions: true, followRedirects: true };
  if (payload !== undefined) {
    params.contentType = 'application/json';
    params.payload = JSON.stringify(payload);
  }
  var resposta = UrlFetchApp.fetch(config.url + caminho, params);
  var texto = resposta.getContentText();
  var json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = null;
  }
  return { codigo: resposta.getResponseCode(), json: json, texto: texto };
}

/** Passo 2 do upload (§10.3): GET /auth/v1/user; qualquer coisa diferente de 200 → TOKEN_INVALIDO. */
function validarToken(config, jwt) {
  if (typeof jwt !== 'string' || jwt.length < 20) throw new Falha('TOKEN_INVALIDO');
  var r = chamarSupabase(config, jwt, 'get', '/auth/v1/user');
  if (r.codigo !== 200 || !r.json || !r.json.id) throw new Falha('TOKEN_INVALIDO');
  return r.json.id;
}

// ---------------------------------------------------------------------------
// upload
// ---------------------------------------------------------------------------
function upload(corpo, config) {
  var finalidade = corpo.finalidade;
  var nome = typeof corpo.nome === 'string' ? corpo.nome.trim() : '';
  var mimeType = corpo.mimeType;
  var base64 = corpo.base64;

  if (FINALIDADES.indexOf(finalidade) === -1 || !nome || typeof mimeType !== 'string' || typeof base64 !== 'string' || !base64) {
    throw new Falha('REQUISICAO_INVALIDA', 'campos do upload');
  }
  if (TIPOS_PERMITIDOS.indexOf(mimeType) === -1) throw new Falha('TIPO_NAO_PERMITIDO');
  // Checagem barata antes de decodificar: 4 caracteres base64 = 3 bytes.
  if (Math.floor((base64.length * 3) / 4) > config.maxBytes + 3) throw new Falha('ARQUIVO_GRANDE');

  var bytes;
  try {
    bytes = Utilities.base64Decode(base64);
  } catch {
    throw new Falha('REQUISICAO_INVALIDA', 'base64');
  }
  if (bytes.length === 0) throw new Falha('REQUISICAO_INVALIDA', 'arquivo vazio');
  if (bytes.length > config.maxBytes) throw new Falha('ARQUIVO_GRANDE');

  var jwt = corpo.accessToken;
  validarToken(config, jwt);

  var agora = new Date();
  var nomeOriginal = nome.slice(0, 200);
  var nomeDrive = Utilities.formatDate(agora, FUSO, 'yyyyMMdd-HHmmss') + '_' + sanitizarNome(nome);

  var arquivoDrive;
  try {
    var pasta = pastaDoMes(config.pastaRaizId, finalidade + 's', Utilities.formatDate(agora, FUSO, 'yyyy-MM'));
    arquivoDrive = pasta.createFile(Utilities.newBlob(bytes, mimeType, nomeDrive));
    arquivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (erroDrive) {
    console.error('ERRO_DRIVE', erroDrive && erroDrive.stack ? erroDrive.stack : erroDrive);
    if (arquivoDrive) lixeira(arquivoDrive.getId());
    throw new Falha('ERRO_DRIVE');
  }

  var driveId = arquivoDrive.getId();
  var r = chamarSupabase(
    config,
    jwt,
    'post',
    '/rest/v1/arquivos',
    {
      drive_file_id: driveId,
      nome: nomeOriginal,
      mime_type: mimeType,
      tamanho_bytes: bytes.length,
      url_visualizacao: 'https://drive.google.com/file/d/' + driveId + '/view',
      finalidade: finalidade,
      conta_armazenamento: config.conta,
    },
    { Prefer: 'return=representation' },
  );

  var linha = r.json && r.json.length ? r.json[0] : null;
  if (r.codigo < 200 || r.codigo >= 300 || !linha) {
    console.error('SEM_PERMISSAO no insert de arquivos', r.codigo, r.texto);
    lixeira(driveId);
    throw new Falha('SEM_PERMISSAO');
  }

  return {
    ok: true,
    arquivo: {
      id: linha.id,
      nome: linha.nome,
      mime_type: linha.mime_type,
      tamanho_bytes: Number(linha.tamanho_bytes),
      url_visualizacao: linha.url_visualizacao,
    },
  };
}

/** "Lista 1 — Funções.pdf" → "Lista-1-Funcoes.pdf". Não inclui o nome da pessoa (§10.3). */
function sanitizarNome(nome) {
  var limpo = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return (limpo || 'arquivo').slice(0, 100);
}

/** raiz / materiais|entregas / AAAA-MM, criando o que faltar. O lock evita pastas duplicadas. */
function pastaDoMes(raizId, nomeFinalidade, nomeMes) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var raiz = DriveApp.getFolderById(raizId);
    var pastaFinalidade = subpasta(raiz, nomeFinalidade);
    return subpasta(pastaFinalidade, nomeMes);
  } finally {
    lock.releaseLock();
  }
}

function subpasta(pai, nome) {
  var existentes = pai.getFoldersByName(nome);
  return existentes.hasNext() ? existentes.next() : pai.createFolder(nome);
}

function lixeira(driveId) {
  try {
    DriveApp.getFileById(driveId).setTrashed(true);
    return true;
  } catch (erro) {
    console.error('Falha ao mover para a lixeira', driveId, erro);
    return false;
  }
}

// ---------------------------------------------------------------------------
// delete
// ---------------------------------------------------------------------------
function excluir(corpo, config) {
  var arquivoId = corpo.arquivoId;
  if (typeof arquivoId !== 'string' || !UUID.test(arquivoId)) throw new Falha('REQUISICAO_INVALIDA', 'arquivoId');

  var jwt = corpo.accessToken;
  validarToken(config, jwt);

  var r = chamarSupabase(config, jwt, 'delete', '/rest/v1/arquivos?id=eq.' + arquivoId, undefined, {
    Prefer: 'return=representation',
  });
  if (r.codigo === 409) throw new Falha('EM_USO');
  if (r.codigo < 200 || r.codigo >= 300) {
    console.error('SEM_PERMISSAO no delete de arquivos', r.codigo, r.texto);
    throw new Falha('SEM_PERMISSAO');
  }
  if (!r.json || !r.json.length) throw new Falha('NAO_ENCONTRADO');

  if (!lixeira(r.json[0].drive_file_id)) throw new Falha('ERRO_DRIVE');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// status (somente coordenação)
// ---------------------------------------------------------------------------
function status(corpo, config) {
  var jwt = corpo.accessToken;
  var uid = validarToken(config, jwt);

  var r = chamarSupabase(config, jwt, 'get', '/rest/v1/perfis?select=papel,status&id=eq.' + uid);
  var perfil = r.codigo === 200 && r.json && r.json.length ? r.json[0] : null;
  if (!perfil || perfil.papel !== 'coordenacao' || perfil.status !== 'ativo') throw new Falha('SEM_PERMISSAO');

  return {
    ok: true,
    usadoBytes: DriveApp.getStorageUsed(),
    limiteBytes: DriveApp.getStorageLimit(),
    conta: config.conta,
  };
}
