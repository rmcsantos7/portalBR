/**
 * Middleware de Verificação de cliente_id
 * Garante que o cliente_id da requisição pertence ao usuário autenticado
 */

const { APIError } = require('./errorHandler');
const logger = require('../utils/logger');

/**
 * Extrai cliente_id de query, body ou params
 */
const extrairClienteId = (req) => {
  return req.query?.cliente_id || req.body?.cliente_id || req.params?.cliente_id || null;
};

/**
 * Verifica se o cliente_id da requisição corresponde ao do JWT
 * Administradores podem acessar qualquer cliente
 */
const verificarClienteId = (req, res, next) => {
  const clienteIdRequisicao = extrairClienteId(req);

  // Se não há cliente_id na requisição, prosseguir (a rota decide se é obrigatório)
  if (!clienteIdRequisicao) return next();

  const clienteIdJWT = req.usuario?.cliente_id;
  const isAdmin = req.usuario?.administrador;

  // Administradores podem acessar qualquer cliente
  if (isAdmin) return next();

  // Verificar se o cliente_id corresponde
  if (String(clienteIdRequisicao) !== String(clienteIdJWT)) {
    logger.warn('Tentativa de acesso a cliente não autorizado:', {
      usuario: req.usuario?.codigo,
      clienteIdJWT,
      clienteIdRequisicao
    });
    throw new APIError('Acesso negado: você não tem permissão para este cliente', 403);
  }

  next();
};

module.exports = verificarClienteId;
