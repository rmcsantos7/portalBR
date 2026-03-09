/**
 * Controller de Colaboradores
 * Handlers das requisições HTTP
 */

const colaboradoresService = require('../services/colaboradores.service');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const { extractClienteId } = require('../utils/validators');
const logger = require('../utils/logger');

/**
 * GET /api/colaboradores?cliente_id=1&search=&setor_id=&limit=50&offset=0
 */
const listarColaboradores = asyncHandler(async (req, res) => {
  const { cliente_id, search, setor_id, limit, offset } = req.query;

  // Extrai e valida cliente_id
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  const resultado = await colaboradoresService.listarColaboradores({
    clienteId,
    search: search || '',
    setorId: setor_id ? parseInt(setor_id) : null,
    limit: limit || 50,
    offset: offset || 0
  });

  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/setores?cliente_id=1
 */
const obterSetores = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  const resultado = await colaboradoresService.obterSetores(clienteId);

  return res.status(200).json(resultado);
});

/**
 * POST /api/colaboradores/import?cliente_id=1
 * Multipart form-data com arquivo .xlsx
 */
const importarExcel = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  if (!req.file) {
    throw new APIError('Arquivo não enviado', 400, { campo: 'file' });
  }

  const resultado = await colaboradoresService.processarExcel(req.file, clienteId);

  logger.info('Arquivo importado:', {
    clienteId,
    nomeArquivo: req.file.originalname,
    tamanho: req.file.size
  });

  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/planilha?cliente_id=1
 * Gera e retorna planilha Excel padrão com colaboradores ativos
 */
const baixarPlanilha = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) {
    throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  }

  const buffer = await colaboradoresService.gerarPlanilhaPadrao(clienteId);

  const nomeArquivo = `ImportacaoRecarga-${clienteId}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  res.setHeader('Content-Length', buffer.length);

  logger.info('Planilha padrão baixada:', { clienteId, nomeArquivo });

  return res.send(buffer);
});

module.exports = {
  listarColaboradores,
  obterSetores,
  importarExcel,
  baixarPlanilha
};
