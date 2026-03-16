/**
 * Controller de Créditos
 * Handlers das requisições HTTP
 */

const creditosService = require('../services/creditos.service');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const { extractClienteId } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * POST /api/creditos/gerar?cliente_id=1
 * Body: { colaboradores, descricao, aplicar_mesmo_valor, valor_uniforme }
 *
 * colaboradores: [{ id: 1, valor: 100.00 }, ...]
 * Se aplicar_mesmo_valor = true, usar valor_uniforme para todos
 */
const gerarCredito = asyncHandler(async (req, res) => {
  const { cliente_id, login } = req.query;
  const payload = req.body;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  // Login vem da URL (passado pelo sistema legado)
  const loginUsuario = login || req.user?.email || 'sistema';

  // Valida payload
  const payloadValidado = creditosService.validarPayloadCredito(payload, clienteId);

  // Gera crédito (com transação, replica lógica MKF)
  const resultado = await creditosService.gerarCredito(
    payloadValidado,
    loginUsuario
  );

  logger.info('Crédito gerado via API:', {
    clienteId,
    login: loginUsuario,
    totalColaboradores: payloadValidado.colaboradores.length
  });

  return res.status(201).json(resultado);
});

/**
 * GET /api/creditos/historico?cliente_id=1&limit=50&offset=0&data_inicio=&data_fim=
 */
const obterHistorico = asyncHandler(async (req, res) => {
  const { cliente_id, ...query } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  const resultado = await creditosService.obterHistorico(query, clienteId);

  return res.status(200).json(resultado);
});

/**
 * GET /api/creditos/remessa/:remessa_id?cliente_id=1
 * Detalhes de uma remessa específica (colaboradores e valores)
 */
const obterDetalheRemessa = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const { remessa_id } = req.params;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  const remessaId = parseInt(remessa_id);
  if (!remessaId || remessaId <= 0) {
    throw new APIError('remessa_id inválido', 400, { campo: 'remessa_id' });
  }

  const resultado = await creditosService.obterDetalheRemessa(remessaId, clienteId);

  return res.status(200).json(resultado);
});

module.exports = {
  gerarCredito,
  obterHistorico,
  obterDetalheRemessa
};
