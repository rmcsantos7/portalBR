/**
 * Server Entry Point
 * Inicializa o servidor Express
 */

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3999;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento de sinais de encerramento
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejection não tratada:', { reason, promise });
  process.exit(1);
});
