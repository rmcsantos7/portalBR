/**
 * Middlewares de Tratamento de Erros
 *
 * Formato padrão de erro:
 *   { success: false, error: "msg legível", code: "ERRO_CODE", details?, timestamp }
 */

const logger = require('../utils/logger');

/**
 * Mapa de status HTTP → código de erro padrão
 */
const ERROR_CODES = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE'
};

/**
 * Classe customizada de erro da API
 * @param {string} message - Mensagem legível
 * @param {number} statusCode - HTTP status (default 500)
 * @param {object} details - Detalhes extras (campo, contexto, etc.)
 * @param {string} code - Código de erro programático (auto-derivado se omitido)
 */
class APIError extends Error {
  constructor(message, statusCode = 500, details = {}, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code || ERROR_CODES[statusCode] || 'INTERNAL_ERROR';
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Middleware para erros 404
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    details: {
      path: req.path,
      method: req.method
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware de tratamento de erros centralizado
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Erro capturado:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // APIError (erros controlados da aplicação)
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      ...(Object.keys(err.details).length > 0 && { details: err.details }),
      timestamp: err.timestamp
    });
  }

  // Erro de conexão com banco de dados
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Banco de dados indisponível',
      code: 'SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString()
    });
  }

  // Erro genérico do PostgreSQL
  if (err.name === 'error') {
    return res.status(400).json({
      success: false,
      error: 'Erro ao processar requisição no banco',
      code: 'DATABASE_ERROR',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de multer (upload de arquivo)
  if (err.name === 'MulterError') {
    let message = 'Erro no upload do arquivo';
    let code = 'UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Arquivo muito grande (máximo 10MB)';
      code = 'PAYLOAD_TOO_LARGE';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Apenas um arquivo é permitido';
      code = 'UPLOAD_ERROR';
    }
    return res.status(413).json({
      success: false,
      error: message,
      code,
      timestamp: new Date().toISOString()
    });
  }

  // Erro desconhecido
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    timestamp: new Date().toISOString()
  });
};

/**
 * Wrapper para capturar erros em rotas async
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  APIError,
  ERROR_CODES,
  errorHandler,
  notFoundHandler,
  asyncHandler
};
