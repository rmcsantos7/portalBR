/**
 * Middleware de Autenticação JWT
 */

const authService = require('../services/auth.service');
const { APIError } = require('./errorHandler');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new APIError('Token não fornecido', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = authService.verificarToken(token);
    req.usuario = {
      codigo: decoded.usr_codigo,
      login: decoded.usr_login,
      nome: decoded.usr_nome,
      cliente_id: decoded.crd_cli_id,
      cliente_nome: decoded.cliente_nome,
      cliente_cnpj: decoded.cliente_cnpj,
      administrador: decoded.usr_administrador === 'S'
    };
    next();
  } catch (error) {
    throw new APIError('Token inválido ou expirado', 401);
  }
};

module.exports = authMiddleware;
