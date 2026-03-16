/**
 * Controller de Colaboradores
 * Handlers das requisições HTTP
 */

const colaboradoresService = require('../services/colaboradores.service');
const { asyncHandler, APIError } = require('../middlewares/errorHandler');
const { extractClienteId } = require('../utils/validators');
const logger = require('../utils/logger');

// =============================================
// ENDPOINTS PARA TELA DE CRÉDITOS (existentes)
// =============================================

/**
 * GET /api/colaboradores?cliente_id=1&search=&setor_id=&limit=50&offset=0
 */
const listarColaboradores = asyncHandler(async (req, res) => {
  const { cliente_id, search, setor_id, limit, offset } = req.query;

  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await colaboradoresService.listarColaboradores({
    clienteId, search: search || '', setorId: setor_id ? parseInt(setor_id) : null,
    limit: limit || 50, offset: offset || 0
  });

  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/setores?cliente_id=1
 */
const obterSetores = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await colaboradoresService.obterSetores(clienteId);
  return res.status(200).json(resultado);
});

/**
 * POST /api/colaboradores/import?cliente_id=1 (importação de créditos)
 */
const importarExcel = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });
  if (!req.file) throw new APIError('Arquivo não enviado', 400, { campo: 'file' });

  const resultado = await colaboradoresService.processarExcel(req.file, clienteId);
  logger.info('Arquivo importado:', { clienteId, nomeArquivo: req.file.originalname });
  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/planilha?cliente_id=1
 */
const baixarPlanilha = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const buffer = await colaboradoresService.gerarPlanilhaPadrao(clienteId);
  const nomeArquivo = `ImportacaoRecarga-${clienteId}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

/**
 * GET /api/colaboradores/taxa?cliente_id=1
 */
const obterTaxa = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400, { campo: 'cliente_id' });

  const resultado = await colaboradoresService.obterTaxaCliente(clienteId);
  return res.status(200).json(resultado);
});

// =============================================
// ENDPOINTS PARA TELA DE COLABORADORES (CRUD)
// =============================================

/**
 * GET /api/colaboradores/todos?cliente_id=1&search=
 * Lista TODOS os colaboradores (ativos + bloqueados) para gestão
 */
const listarTodos = asyncHandler(async (req, res) => {
  const { cliente_id, search, limit, offset } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const resultado = await colaboradoresService.listarTodosColaboradores({
    clienteId, search: search || '',
    limit: parseInt(limit) || 100,
    offset: parseInt(offset) || 0
  });
  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/:id?cliente_id=1
 * Obtém dados completos de um colaborador
 */
const obterColaborador = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const resultado = await colaboradoresService.obterColaboradorCompleto(parseInt(id), clienteId);
  return res.status(200).json(resultado);
});

/**
 * POST /api/colaboradores/criar
 * Cria um novo colaborador
 */
const criar = asyncHandler(async (req, res) => {
  const resultado = await colaboradoresService.criarColaborador(req.body);
  return res.status(201).json(resultado);
});

/**
 * PUT /api/colaboradores/:id?cliente_id=1
 * Atualiza um colaborador existente
 */
const atualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const resultado = await colaboradoresService.atualizarColaborador(parseInt(id), clienteId, req.body);
  return res.status(200).json(resultado);
});

/**
 * PATCH /api/colaboradores/:id/situacao?cliente_id=1
 * Altera situação (Ativar/Bloquear)
 */
const mudarSituacao = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const { situacao_id } = req.body;
  const resultado = await colaboradoresService.alterarSituacao(parseInt(id), clienteId, situacao_id);
  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/restaurantes?cliente_id=1
 * Lista restaurantes filtrados por cliente
 */
const obterRestaurantes = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const resultado = await colaboradoresService.obterRestaurantes(clienteId);
  return res.status(200).json(resultado);
});

/**
 * GET /api/colaboradores/planilha-usuarios?cliente_id=1
 * Baixa planilha padrão para importação de colaboradores
 */
const baixarPlanilhaUsuarios = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const buffer = await colaboradoresService.gerarPlanilhaUsuarios(clienteId);
  const nomeArquivo = `ImportacaoColaboradores-${clienteId}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
});

/**
 * POST /api/colaboradores/import-usuarios?cliente_id=1
 * Importa colaboradores via Excel
 */
const importarUsuarios = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);
  if (!req.file) throw new APIError('Arquivo não enviado', 400);

  const resultado = await colaboradoresService.processarExcelUsuarios(req.file, clienteId);
  logger.info('Usuários importados via Excel:', { clienteId });
  return res.status(200).json(resultado);
});

/**
 * POST /api/colaboradores/categorias?cliente_id=1
 * Cria uma nova categoria
 */
const criarCategoria = asyncHandler(async (req, res) => {
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const { nome } = req.body;
  const resultado = await colaboradoresService.criarCategoria(clienteId, nome);
  return res.status(201).json(resultado);
});

/**
 * DELETE /api/colaboradores/categorias/:id?cliente_id=1
 * Deleta uma categoria
 */
const deletarCategoria = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { cliente_id } = req.query;
  const clienteId = extractClienteId(cliente_id);
  if (!clienteId) throw new APIError('cliente_id inválido ou não fornecido', 400);

  const resultado = await colaboradoresService.deletarCategoria(id, clienteId);
  return res.status(200).json(resultado);
});

module.exports = {
  // Créditos (existentes)
  listarColaboradores,
  obterSetores,
  importarExcel,
  baixarPlanilha,
  obterTaxa,
  // CRUD Colaboradores (novos)
  listarTodos,
  obterColaborador,
  criar,
  atualizar,
  mudarSituacao,
  obterRestaurantes,
  baixarPlanilhaUsuarios,
  importarUsuarios,
  // Categorias
  criarCategoria,
  deletarCategoria
};
