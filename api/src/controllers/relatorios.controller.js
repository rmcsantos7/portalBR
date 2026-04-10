/**
 * Controller de Relatórios
 * Endpoints para geração de relatórios
 */

const relatoriosService = require('../services/relatorios.service');
const { extractClienteId } = require('../utils/validators');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');

/**
 * GET /api/relatorios/recargas-periodo?cliente_id=1&data_inicio=2024-01-01&data_fim=2024-12-31
 */
const relatorioRecargasPeriodo = asyncHandler(async (req, res) => {
  const { cliente_id, data_inicio, data_fim } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await relatoriosService.relatorioRecargasPeriodo(clienteId, data_inicio, data_fim);
  return res.status(200).json(resultado);
});

/**
 * GET /api/relatorios/colaboradores?cliente_id=1
 */
const relatorioColaboradores = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await relatoriosService.relatorioColaboradores(clienteId);
  return res.status(200).json(resultado);
});

/**
 * GET /api/relatorios/historico-colaborador/:colaborador_id?cliente_id=1&data_inicio=...&data_fim=...
 */
const relatorioHistoricoColaborador = asyncHandler(async (req, res) => {
  const { cliente_id, data_inicio, data_fim } = req.query;
  const { colaborador_id } = req.params;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await relatoriosService.relatorioHistoricoColaborador(clienteId, colaborador_id, data_inicio, data_fim);
  return res.status(200).json(resultado);
});

/**
 * GET /api/relatorios/colaboradores-lista?cliente_id=1&search=
 */
const listarColaboradoresRelatorio = asyncHandler(async (req, res) => {
  const { cliente_id, search } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await relatoriosService.listarColaboradoresRelatorio(clienteId, search);
  return res.status(200).json(resultado);
});

module.exports = {
  relatorioRecargasPeriodo,
  relatorioColaboradores,
  relatorioHistoricoColaborador,
  listarColaboradoresRelatorio
};
