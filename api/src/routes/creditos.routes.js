/**
 * Rotas de Créditos
 */

const express = require('express');
const router = express.Router();

const creditosController = require('../controllers/creditos.controller');

/**
 * POST /api/creditos/gerar
 * Query: cliente_id
 * Body: { colaboradores, descricao, aplicar_mesmo_valor, valor_uniforme }
 */
router.post('/gerar', creditosController.gerarCredito);

/**
 * GET /api/creditos/historico
 * Query: cliente_id, limit, offset, data_inicio, data_fim
 */
router.get('/historico', creditosController.obterHistorico);

/**
 * GET /api/creditos/remessa/:remessa_id
 * Query: cliente_id
 * Detalhes de uma remessa (colaboradores e valores)
 */
router.get('/remessa/:remessa_id', creditosController.obterDetalheRemessa);

module.exports = router;
