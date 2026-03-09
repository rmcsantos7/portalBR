/**
 * Middleware de Upload de Arquivo
 * Configuração do multer para processamento seguro
 */

const multer = require('multer');
const logger = require('../utils/logger');

// Configuração de armazenamento (em memória)
const storage = multer.memoryStorage();

// Filtro de arquivo
const fileFilter = (req, file, cb) => {
  // Valida tipo de arquivo
  const tiposPermitidos = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const nomePermitido = file.originalname.toLowerCase().endsWith('.xlsx') || file.originalname.toLowerCase().endsWith('.xls');

  if (tiposPermitidos.includes(file.mimetype) || nomePermitido) {
    cb(null, true);
  } else {
    logger.warn('Arquivo rejeitado:', {
      nomeArquivo: file.originalname,
      mimetype: file.mimetype
    });
    cb(new Error('Apenas arquivos .xlsx ou .xls são permitidos'), false);
  }
};

// Configuração do multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Apenas um arquivo
  }
});

module.exports = upload;
