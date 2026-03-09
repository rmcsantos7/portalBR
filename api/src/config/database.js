/**
 * Banco de Dados - Configuração PostgreSQL
 * Pool de conexões com tratamento de erros
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'seu_banco',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Evento de conexão bem-sucedida
pool.on('connect', () => {
  logger.info('✅ Nova conexão criada no pool');
});

// Evento de erro na pool
pool.on('error', (err) => {
  logger.error('❌ Erro inesperado na pool:', err);
});

/**
 * Executa uma query parametrizada (segura contra SQL injection)
 * @param {string} query - Consulta SQL com $1, $2, etc.
 * @param {array} params - Parâmetros da query
 * @returns {Promise<object>} Resultado da query
 */
const query = async (sql, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(sql, params);
    const duration = Date.now() - start;
    logger.debug(`Query executada em ${duration}ms`, { query: sql.substring(0, 100) });
    return result;
  } catch (error) {
    logger.error('Erro na query:', { error: error.message, query: sql.substring(0, 100) });
    throw error;
  }
};

/**
 * Inicia uma transação
 * @returns {Promise<object>} Client da transação
 */
const getClient = async () => {
  return pool.connect();
};

/**
 * Testa a conexão com o banco
 */
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    logger.info('✅ Conexão com banco de dados estabelecida');
    return true;
  } catch (error) {
    logger.error('❌ Falha ao conectar ao banco:', error);
    return false;
  }
};

// Testa conexão ao iniciar
testConnection();

module.exports = {
  query,
  getClient,
  pool
};
