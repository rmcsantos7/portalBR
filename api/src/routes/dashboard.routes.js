/**
 * Rotas da Dashboard
 */

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth');
const verificarClienteId = require('../middlewares/verificarClienteId');

// Dashboard (protegido por JWT + verificação de cliente)
router.get('/', authMiddleware, verificarClienteId, dashboardController.obterDashboard);

module.exports = router;
