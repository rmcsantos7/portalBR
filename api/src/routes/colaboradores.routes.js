/**
 * Rotas de Colaboradores
 */

const express = require('express');
const router = express.Router();

const colaboradoresController = require('../controllers/colaboradores.controller');
const upload = require('../middlewares/upload');

/**
 * GET /api/colaboradores
 * Query: cliente_id, search, setor_id, limit, offset
 */
router.get('/', colaboradoresController.listarColaboradores);

/**
 * GET /api/colaboradores/setores
 * Query: cliente_id
 */
router.get('/setores', colaboradoresController.obterSetores);

/**
 * GET /api/colaboradores/planilha
 * Query: cliente_id
 * Gera e retorna planilha Excel padrão com colaboradores ativos
 */
router.get('/planilha', colaboradoresController.baixarPlanilha);

/**
 * POST /api/colaboradores/import
 * Query: cliente_id
 * Body: multipart/form-data (file)
 */
router.post('/import', upload.single('file'), colaboradoresController.importarExcel);

module.exports = router;
