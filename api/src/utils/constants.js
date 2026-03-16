/**
 * Constantes da aplicação
 * Centraliza valores mágicos e configurações reutilizáveis
 */

// Paginação
const PAGINATION = {
  DEFAULT_LIMIT: 15,
  MAX_LIMIT: 500,
  DEFAULT_OFFSET: 0
};

// Situações de colaborador
const SITUACAO = {
  ATIVO: { id: 1, label: 'ATIVO' },
  BLOQUEADO: { id: 2, label: 'BLOQUEADO' }
};

// Upload
const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIMES: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  ALLOWED_EXTENSIONS: ['.xlsx', '.xls']
};

// Sexo
const SEXO_VALIDOS = ['M', 'F'];

// Mensagens de erro padrão
const ERRORS = {
  CLIENTE_ID_INVALIDO: 'cliente_id inválido ou não fornecido',
  NAO_ENCONTRADO: 'Registro não encontrado',
  SEM_PERMISSAO: 'Sem permissão para esta operação',
  ERRO_INTERNO: 'Erro interno do servidor'
};

module.exports = {
  PAGINATION,
  SITUACAO,
  UPLOAD,
  SEXO_VALIDOS,
  ERRORS
};
