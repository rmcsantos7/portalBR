# API de Geração de Crédito

Backend Node.js/Express para geração de crédito em massa para colaboradores.

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 14.0.0
- npm >= 6.0.0
- PostgreSQL >= 12
- Git

### Passos

1. **Clone o repositório**
```bash
git clone <seu-repo>
cd api
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

4. **Teste a conexão com banco**
```bash
npm start
# Você deve ver: "✅ Conexão com banco de dados estabelecida"
```

5. **Inicie o servidor (desenvolvimento)**
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3001`

## 📋 Estrutura de Pastas

```
src/
├── app.js                      # Express app principal
├── server.js                   # Entry point
├── config/
│   └── database.js            # Configuração PostgreSQL
├── controllers/
│   ├── colaboradores.controller.js
│   └── creditos.controller.js
├── services/
│   ├── colaboradores.service.js
│   └── creditos.service.js
├── repositories/
│   ├── colaboradores.repository.js
│   └── creditos.repository.js
├── routes/
│   ├── colaboradores.routes.js
│   └── creditos.routes.js
├── middlewares/
│   ├── errorHandler.js
│   └── upload.js
└── utils/
    ├── logger.js
    └── validators.js
```

## 🔒 Segurança

### Implementado
- ✅ **SQL Injection Prevention**: Queries parametrizadas (prepared statements)
- ✅ **CORS**: Configurado com origem específica
- ✅ **Helmet**: Headers de segurança HTTP
- ✅ **Input Validation**: Validação rigorosa de entrada
- ✅ **File Upload Security**: Validação de tipo e tamanho
- ✅ **Error Handling**: Sem expor detalhes internos
- ✅ **Logging**: Auditoria completa de operações
- ✅ **Rate Limiting**: Pronto para implementar (middleware)
- ✅ **Transaction Management**: Rollback automático em erro

### Proteção contra ameaças comuns
- XSS: Sanitização de entrada
- CSRF: Tokens (pronto para implementar)
- DDoS: Rate limiting (pronto para implementar)

## 📚 API Endpoints

### Colaboradores

#### GET `/api/colaboradores`
Lista colaboradores ativos com filtros.

**Query Parameters:**
- `cliente_id` (obrigatório): ID do cliente
- `search` (opcional): Busca por nome ou CPF
- `categoria` (opcional): Filtra por categoria
- `limit` (opcional, padrão: 50): Limite de resultados (máx: 500)
- `offset` (opcional, padrão: 0): Paginação

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "João Silva",
      "cpf": "12345678900",
      "restaurante": "Restaurante A",
      "categoria": "Gerente",
      "status": "ATIVO"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "page": 0
}
```

#### GET `/api/colaboradores/categorias`
Obtém categorias de colaboradores.

**Query Parameters:**
- `cliente_id` (obrigatório): ID do cliente

#### POST `/api/colaboradores/import`
Importa colaboradores de arquivo Excel.

**Query Parameters:**
- `cliente_id` (obrigatório): ID do cliente

**Body:**
- `file` (multipart/form-data): Arquivo .xlsx ou .xls

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_importados": 150,
    "total_erros": 5,
    "erros": [
      {
        "linha": 2,
        "nome": "João",
        "cpf": "12345678900",
        "erros": ["CPF inválido"]
      }
    ],
    "colaboradores": [
      {
        "nome": "João Silva",
        "cpf": "12345678900",
        "valor": 100.00,
        "categoria": "Gerente"
      }
    ]
  }
}
```

### Créditos

#### POST `/api/creditos/gerar`
Gera crédito para múltiplos colaboradores.

**Query Parameters:**
- `cliente_id` (obrigatório): ID do cliente

**Body:**
```json
{
  "colaboradores": [
    {"id": 1, "valor": 100.00},
    {"id": 2, "valor": 150.00}
  ],
  "tipo_credito": "Crédito Manual",
  "descricao": "Bônus mensal",
  "data_credito": "2026-03-09",
  "aplicar_mesmo_valor": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Crédito gerado com sucesso para 2 colaborador(es)",
  "data": {
    "remessa_id": 12345,
    "total_colaboradores": 2,
    "valor_total": 250.00,
    "data_criacao": "2026-03-09T14:30:00Z",
    "criado_por": "usuario@example.com"
  }
}
```

#### GET `/api/creditos/historico`
Obtém histórico de gerações de crédito.

**Query Parameters:**
- `cliente_id` (obrigatório): ID do cliente
- `limit` (opcional, padrão: 50): Limite de resultados
- `offset` (opcional, padrão: 0): Paginação
- `tipo_credito` (opcional): Filtro por tipo
- `data_inicio` (opcional): Data inicial (YYYY-MM-DD)
- `data_fim` (opcional): Data final (YYYY-MM-DD)

#### GET `/api/creditos/tipos`
Obtém tipos de crédito disponíveis.

## 🧪 Testes

```bash
# Executar testes
npm test

# Modo watch
npm run test:watch

# Cobertura
npm run test:coverage
```

## 📊 Logs

Logs estruturados com diferentes níveis:
- `error`: Erros graves
- `warn`: Avisos
- `info`: Informações importantes
- `debug`: Detalhes de desenvolvimento

Configure em `.env`:
```
LOG_LEVEL=info
```

## 🔍 Troubleshooting

### Erro: "Conexão com banco de dados recusada"
- Verifique se PostgreSQL está rodando
- Confira credenciais em `.env`
- Teste: `psql -U postgres -h localhost`

### Erro: "CORS error"
- Atualize `CORS_ORIGIN` em `.env`
- Exemplo: `CORS_ORIGIN=http://localhost:3000`

### Erro: "Arquivo muito grande"
- Máximo 10MB
- Configure em `.env` se necessário

## 📈 Performance

- **Paginação**: Implementada (padrão 50 por página)
- **Índices**: Recomendado criar índices no banco
- **Connection Pool**: Pool de 20 conexões
- **Queries**: Otimizadas com LIMIT/OFFSET

### SQL Recomendado
```sql
CREATE INDEX idx_crd_usuario_sit_id ON crd_usuario(crd_sit_id);
CREATE INDEX idx_crd_usuario_cli_id ON crd_usuario(crd_cli_id);
CREATE INDEX idx_crd_usuario_nome ON crd_usuario(crd_usr_nome);
CREATE INDEX idx_credito_remessa_id ON crd_usuario_credito_remessa(crd_usucrerem_id);
```

## 🤝 Contribuindo

1. Faça fork
2. Crie uma branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

MIT

## 👤 Suporte

Para problemas, abra uma issue no repositório.

---

**Versão:** 1.0.0  
**Última atualização:** 2026-03-09
