/**
 * Rotas de Autenticação
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

// Login (público)
router.post('/login', authController.login);

// Recuperação de senha (público)
router.post('/recuperar-senha', authController.recuperarSenha);

// Dados do usuário logado (protegido)
router.get('/me', authMiddleware, authController.me);

// Troca de senha (protegido)
router.post('/trocar-senha', authMiddleware, authController.trocarSenha);

// Lista de clientes — apenas administradores (protegido)
router.get('/clientes', authMiddleware, authController.listarClientes);

// Troca cliente ativo do admin — retorna novo JWT (protegido)
router.post('/trocar-cliente', authMiddleware, authController.trocarCliente);

module.exports = router;
