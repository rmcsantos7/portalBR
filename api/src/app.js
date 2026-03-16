/**
 * Arquivo Principal - Express App
 * Configuração de middlewares, CORS, rotas e tratamento de erros
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const colaboradoresRoutes = require('./routes/colaboradores.routes');
const creditosRoutes = require('./routes/creditos.routes');
const relatoriosRoutes = require('./routes/relatorios.routes');

// Importar middlewares de erro
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Confiar no proxy (Nginx, load balancer) para pegar IP real via X-Forwarded-For
app.set('trust proxy', 1);

// ========== MIDDLEWARES DE SEGURANÇA ==========

// Helmet com CSP configurado
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS com whitelist de origens permitidas
const origensPermitidas = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (apps mobile, curl, etc.)
    if (!origin) return callback(null, true);
    // Em desenvolvimento, aceitar qualquer origin
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (origensPermitidas.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Bloqueado por CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== RATE LIMITING ==========

// Rate limit global: 200 req/min por IP
const limiterGlobal = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas requisições. Tente novamente em 1 minuto.' }
});

// Rate limit para login: 15 tentativas/15min por IP
const limiterLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.' }
});

app.use(limiterGlobal);

// ========== MIDDLEWARES DE PARSING ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========== LOGGING ==========
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ========== ROTAS ==========
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rate limit para recuperação de senha: 3 tentativas/15min por IP
const limiterRecuperarSenha = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Muitas solicitações de recuperação. Tente novamente em 15 minutos.' }
});

// Aplicar rate limits específicos para rotas de auth
app.use('/api/auth/login', limiterLogin);
app.use('/api/auth/recuperar-senha', limiterRecuperarSenha);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/creditos', creditosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

// ========== MANIPULADORES DE ERRO ==========
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
