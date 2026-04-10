/**
 * Service da Dashboard
 */

const dashboardRepository = require('../repositories/dashboard.repository');
const { APIError } = require('../middlewares/errorHandler');
const { ok } = require('../utils/response');
const logger = require('../utils/logger');

const obterDashboard = async (clienteId, inicio, fim) => {
  if (!clienteId) throw new APIError('cliente_id é obrigatório', 400);

  // Padrão: últimos 30 dias
  const dtFim = fim || new Date().toISOString().split('T')[0];
  const dtInicio = inicio || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  })();

  try {
    const [movTotal, totalColaboradores, totalRepasses, ticketMedio, evolucao, topColaboradores] = await Promise.all([
      dashboardRepository.buscarMovTotal(clienteId, dtInicio, dtFim),
      dashboardRepository.buscarTotalColaboradores(clienteId),
      dashboardRepository.buscarTotalRepasses(clienteId, dtInicio, dtFim),
      dashboardRepository.buscarTicketMedio(clienteId, dtInicio, dtFim),
      dashboardRepository.buscarEvolucaoRecargas(clienteId, dtInicio, dtFim),
      dashboardRepository.buscarTopColaboradores(clienteId, dtInicio, dtFim)
    ]);

    return ok({
      periodo: { inicio: dtInicio, fim: dtFim },
      cards: {
        movTotal,
        totalColaboradores,
        totalRepasses,
        ticketMedio
      },
      graficos: {
        evolucaoRecargas: evolucao,
        topColaboradores
      }
    });
  } catch (error) {
    if (error instanceof APIError) throw error;
    logger.error('Erro ao obter dashboard:', { error: error.message });
    throw new APIError('Erro ao carregar dashboard', 500);
  }
};

module.exports = { obterDashboard };
