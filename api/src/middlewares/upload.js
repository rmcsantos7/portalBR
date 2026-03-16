/**
 * Middleware de Upload de Arquivo
 * Configuração do multer com validação de conteúdo (magic numbers)
 */

const multer = require('multer');
const logger = require('../utils/logger');

// Configuração de armazenamento (em memória)
const storage = multer.memoryStorage();

// Magic numbers para validação de conteúdo real do arquivo
const MAGIC_NUMBERS = {
  // XLSX (ZIP-based): PK\x03\x04
  xlsx: [0x50, 0x4B, 0x03, 0x04],
  // XLS (OLE2 Compound): \xD0\xCF\x11\xE0
  xls: [0xD0, 0xCF, 0x11, 0xE0]
};

/**
 * Verifica magic number do buffer do arquivo
 */
const validarConteudoArquivo = (buffer) => {
  if (!buffer || buffer.length < 4) return false;
  const header = [...buffer.slice(0, 4)];

  return (
    MAGIC_NUMBERS.xlsx.every((byte, i) => header[i] === byte) ||
    MAGIC_NUMBERS.xls.every((byte, i) => header[i] === byte)
  );
};

// Filtro de arquivo (MIME + extensão)
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const nomePermitido = file.originalname.toLowerCase().endsWith('.xlsx') ||
                        file.originalname.toLowerCase().endsWith('.xls');

  if (tiposPermitidos.includes(file.mimetype) || nomePermitido) {
    cb(null, true);
  } else {
    logger.warn('Arquivo rejeitado por tipo:', {
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

/**
 * Middleware que valida o conteúdo do arquivo após upload (magic numbers)
 * Usar APÓS o multer: upload.single('file'), validarConteudo
 */
const validarConteudo = (req, res, next) => {
  if (!req.file) return next();

  if (!validarConteudoArquivo(req.file.buffer)) {
    logger.warn('Arquivo rejeitado por conteúdo (magic number inválido):', {
      nomeArquivo: req.file.originalname,
      mimetype: req.file.mimetype,
      tamanho: req.file.size
    });
    return res.status(400).json({
      success: false,
      error: 'O conteúdo do arquivo não corresponde a um Excel válido (.xlsx/.xls)'
    });
  }

  next();
};

module.exports = upload;
module.exports.validarConteudo = validarConteudo;
