/**
 * Rotas de Relatórios
 */

const express = require('express');
const router = express.Router();

const relatoriosController = require('../controllers/relatorios.controller');
const authMiddleware = require('../middlewares/auth');
const verificarClienteId = require('../middlewares/verificarClienteId');

// Todas as rotas protegidas
router.use(authMiddleware);
router.use(verificarClienteId);

/**
 * GET /api/relatorios/recargas-periodo
 * Query: cliente_id, data_inicio, data_fim
 */
router.get('/recargas-periodo', relatoriosController.relatorioRecargasPeriodo);

/**
 * GET /api/relatorios/colaboradores
 * Query: cliente_id
 */
router.get('/colaboradores', relatoriosController.relatorioColaboradores);

/**
 * GET /api/relatorios/historico-colaborador/:colaborador_id
 * Query: cliente_id, data_inicio, data_fim
 */
router.get('/historico-colaborador/:colaborador_id', relatoriosController.relatorioHistoricoColaborador);

/**
 * GET /api/relatorios/colaboradores-lista
 * Query: cliente_id, search
 * Lista de colaboradores para seleção no relatório
 */
router.get('/colaboradores-lista', relatoriosController.listarColaboradoresRelatorio);

module.exports = router;
