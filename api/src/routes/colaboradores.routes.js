/**
 * Rotas de Colaboradores
 */

const express = require('express');
const router = express.Router();

const colaboradoresController = require('../controllers/colaboradores.controller');
const upload = require('../middlewares/upload');
const { validarConteudo } = require('../middlewares/upload');
const authMiddleware = require('../middlewares/auth');
const verificarClienteId = require('../middlewares/verificarClienteId');

// Todas as rotas de colaboradores são protegidas + verificação de cliente_id
router.use(authMiddleware);
router.use(verificarClienteId);

// =============================================
// ROTAS PARA TELA DE CRÉDITOS (existentes)
// =============================================

/**
 * GET /api/colaboradores
 * Lista colaboradores ativos para geração de crédito
 */
router.get('/', colaboradoresController.listarColaboradores);

/**
 * GET /api/colaboradores/setores
 */
router.get('/setores', colaboradoresController.obterSetores);

/**
 * GET /api/colaboradores/planilha
 */
router.get('/planilha', colaboradoresController.baixarPlanilha);

/**
 * POST /api/colaboradores/import
 * Importação de créditos via Excel
 */
router.post('/import', upload.single('file'), validarConteudo, colaboradoresController.importarExcel);

/**
 * GET /api/colaboradores/taxa
 */
router.get('/taxa', colaboradoresController.obterTaxa);

// =============================================
// ROTAS PARA TELA DE COLABORADORES (CRUD)
// =============================================

/**
 * GET /api/colaboradores/todos
 * Lista TODOS (ativos + bloqueados) para gestão
 */
router.get('/todos', colaboradoresController.listarTodos);

/**
 * GET /api/colaboradores/restaurantes
 * Lista restaurantes para dropdown
 */
router.get('/restaurantes', colaboradoresController.obterRestaurantes);

/**
 * POST /api/colaboradores/criar
 * Cria novo colaborador
 */
router.post('/criar', colaboradoresController.criar);

/**
 * GET /api/colaboradores/planilha-usuarios
 * Baixa planilha padrão para importação de colaboradores
 */
router.get('/planilha-usuarios', colaboradoresController.baixarPlanilhaUsuarios);

/**
 * POST /api/colaboradores/import-usuarios
 * Importação de colaboradores via Excel
 */
router.post('/import-usuarios', upload.single('file'), validarConteudo, colaboradoresController.importarUsuarios);

/**
 * POST /api/colaboradores/categorias?cliente_id=1
 * Cria nova categoria
 */
router.post('/categorias', colaboradoresController.criarCategoria);

/**
 * DELETE /api/colaboradores/categorias/:id?cliente_id=1
 * Deleta uma categoria
 */
router.delete('/categorias/:id', colaboradoresController.deletarCategoria);

/**
 * GET /api/colaboradores/:id
 * Obtém dados completos de um colaborador
 */
router.get('/:id', colaboradoresController.obterColaborador);

/**
 * PUT /api/colaboradores/:id
 * Atualiza colaborador
 */
router.put('/:id', colaboradoresController.atualizar);

/**
 * PATCH /api/colaboradores/:id/situacao
 * Altera situação (Ativar/Bloquear)
 */
router.patch('/:id/situacao', colaboradoresController.mudarSituacao);

module.exports = router;
