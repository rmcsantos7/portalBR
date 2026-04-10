/**
 * Rotas de Créditos
 */

const express = require('express');
const router = express.Router();

const creditosController = require('../controllers/creditos.controller');
const authMiddleware = require('../middlewares/auth');
const verificarClienteId = require('../middlewares/verificarClienteId');

// Rotas públicas (proxy hub-bass — usadas por <img> e <a> no browser, sem JWT)
router.get('/nota/:nota_id/pdf', creditosController.obterBoletoPdf);
router.get('/nota/:nota_id/qrcode', creditosController.obterBoletoQrCode);

// Demais rotas protegidas
router.use(authMiddleware);
router.use(verificarClienteId);

router.post('/gerar', creditosController.gerarCredito);
router.get('/historico', creditosController.obterHistorico);
router.get('/remessa/:remessa_id', creditosController.obterDetalheRemessa);
router.delete('/remessa/:remessa_id', creditosController.cancelarRemessa);

module.exports = router;
