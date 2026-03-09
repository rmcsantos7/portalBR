/**
 * Middlewares de Tratamento de Erros
 */

const logger = require('../utils/logger');

/**
 * Classe customizada de erro da API
 */
class APIError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
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
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};

/**
 * Middleware de tratamento de erros centralizado
 */
const errorHandler = (err, req, res, next) => {
  logger.error('Erro capturado:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Erro de validação
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      details: err.details,
      timestamp: err.timestamp
    });
  }

  // Erro de banco de dados
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      error: 'Banco de dados indisponível',
      timestamp: new Date().toISOString()
    });
  }

  // Erro genérico do PostgreSQL
  if (err.name === 'error') {
    return res.status(400).json({
      success: false,
      error: 'Erro ao processar requisição no banco',
      timestamp: new Date().toISOString()
    });
  }

  // Erro de multer (upload de arquivo)
  if (err.name === 'MulterError') {
    let message = 'Erro no upload do arquivo';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Arquivo muito grande (máximo 10MB)';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Apenas um arquivo é permitido';
    }
    return res.status(413).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  // Erro desconhecido
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
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
  errorHandler,
  notFoundHandler,
  asyncHandler
};
