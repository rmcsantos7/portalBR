/**
 * Arquivo Principal - Express App
 * Configuração de middlewares, CORS, rotas e tratamento de erros
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar rotas
const colaboradoresRoutes = require('./routes/colaboradores.routes');
const creditosRoutes = require('./routes/creditos.routes');

// Importar middlewares de erro
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// ========== MIDDLEWARES DE SEGURANÇA ==========
app.use(helmet()); // Proteção contra ataques comuns
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== MIDDLEWARES DE PARSING ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========== LOGGING ==========
app.use(morgan('combined'));

// ========== ROTAS ==========
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/creditos', creditosRoutes);

// ========== MANIPULADORES DE ERRO ==========
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
