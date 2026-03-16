/**
 * Controller da Dashboard
 */

const dashboardService = require('../services/dashboard.service');
const { asyncHandler } = require('../middlewares/errorHandler');

/**
 * GET /api/dashboard?inicio=2026-02-07&fim=2026-03-09
 */
const obterDashboard = asyncHandler(async (req, res) => {
  const inicio = req.query.data_inicio || req.query.inicio;
  const fim = req.query.data_fim || req.query.fim;
  // cliente_id vem do token JWT (middleware auth)
  const clienteId = req.usuario.cliente_id;
  const resultado = await dashboardService.obterDashboard(clienteId, inicio, fim);
  return res.status(200).json(resultado);
});

module.exports = { obterDashboard };
