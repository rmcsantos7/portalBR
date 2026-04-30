/**
 * Job: cancelar remessas vencidas
 *
 * Varre remessas cuja nota fiscal já passou da data de vencimento e cujo
 * boleto não foi pago, e dispara o fluxo de cancelamento (mesma rotina
 * usada pelo cancelamento manual).
 */

const cron = require('node-cron');
const creditosService = require('../services/creditos.service');
const creditosRepository = require('../repositories/creditos.repository');
const logger = require('../utils/logger');

const executar = async () => {
  const inicio = Date.now();
  logger.info('[Job] Cancelamento de remessas vencidas: iniciado');

  let candidatas = [];
  try {
    candidatas = await creditosRepository.listarRemessasVencidasAbertas();
  } catch (err) {
    logger.error('[Job] Falha ao listar remessas vencidas:', { error: err.message });
    return;
  }

  if (candidatas.length === 0) {
    logger.info('[Job] Nenhuma remessa vencida em aberto encontrada');
    return;
  }

  logger.info(`[Job] ${candidatas.length} remessa(s) vencida(s) em aberto encontrada(s)`);

  let canceladas = 0;
  let falhas = 0;

  for (const r of candidatas) {
    try {
      await creditosService.cancelarRemessa(r.remessa_id, r.cliente_id, 'JOB_VENCIDO');
      canceladas++;
      logger.info('[Job] Remessa vencida cancelada:', {
        remessaId: r.remessa_id,
        clienteId: r.cliente_id,
        dataVencimento: r.data_vencimento,
        boletoStatusAnterior: r.boleto_status
      });
    } catch (err) {
      falhas++;
      logger.error('[Job] Falha ao cancelar remessa vencida:', {
        remessaId: r.remessa_id,
        clienteId: r.cliente_id,
        error: err.message
      });
    }
  }

  const duracaoMs = Date.now() - inicio;
  logger.info('[Job] Cancelamento de remessas vencidas: concluído', {
    total: candidatas.length,
    canceladas,
    falhas,
    duracaoMs
  });
};

const iniciar = () => {
  const habilitado = (process.env.CRON_CANCEL_VENCIDOS_ENABLED || 'true').toLowerCase() === 'true';
  if (!habilitado) {
    logger.info('[Job] Cancelamento de remessas vencidas: desabilitado (CRON_CANCEL_VENCIDOS_ENABLED=false)');
    return;
  }

  const expressao = process.env.CRON_CANCEL_VENCIDOS || '0 3 * * *';
  if (!cron.validate(expressao)) {
    logger.error('[Job] Expressão cron inválida para CRON_CANCEL_VENCIDOS:', { expressao });
    return;
  }

  cron.schedule(expressao, () => { executar().catch(() => {}); }, {
    timezone: process.env.TZ || 'America/Sao_Paulo'
  });

  logger.info('[Job] Cancelamento de remessas vencidas: agendado', { expressao });
};

module.exports = { iniciar, executar };
