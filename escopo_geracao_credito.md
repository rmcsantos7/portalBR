# 📋 ESCOPO - GERAÇÃO DE CRÉDITO
## React Frontend + Node.js Backend (REST API)

---

## 1. VISÃO GERAL DO PROJETO

**Objetivo:** Criar uma aplicação web para geração/crédito em massa para colaboradores.

**Stack:**
- **Frontend:** React (componentes funcionais, hooks)
- **Backend:** Node.js + Express
- **Banco de Dados:** PostgreSQL (já existe no sistema principal)
- **Integração:** API REST

---

## 2. ARQUITETURA

```
Frontend (React)
    ↓ (HTTP REST)
Backend (Node.js/Express)
    ↓ (SQL Queries)
PostgreSQL Database
```

---

## 3. ENDPOINTS API (Node.js)

### 3.1 GET - Listar Colaboradores

**Endpoint:** `GET /api/colaboradores`

**Query Params:**
- `status=ATIVO` (obrigatório)
- `search=` (opcional - busca por nome)
- `categoria=` (opcional - filtra por categoria)
- `restaurante_id=` (opcional)
- `limit=100&offset=0` (paginação)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nome": "João Silva",
      "cpf": "123.456.789-00",
      "restaurante": "Restaurante A",
      "categoria": "Gerente",
      "status": "ATIVO"
    }
  ],
  "total": 150,
  "page": 0,
  "limit": 100
}
```

**Errors:**
- `400` - Parâmetros inválidos
- `401` - Não autenticado
- `500` - Erro do servidor

---

### 3.2 POST - Upload de Excel

**Endpoint:** `POST /api/colaboradores/import`

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Body:**
- `file` (FormData) - arquivo .xlsx

**Validações:**
- Arquivo deve ser .xlsx
- Colunas obrigatórias: `nome`, `cpf`, `valor` (opcional: `categoria`, `restaurante`)
- Máximo 5000 linhas
- CPF válido (formato)

**Response (200):**
```json
{
  "success": true,
  "message": "150 colaboradores importados com sucesso",
  "data": {
    "total_importados": 150,
    "erros": [
      {
        "linha": 5,
        "cpf": "111.222.333-44",
        "erro": "CPF inválido"
      }
    ],
    "colaboradores": [
      { "id": 1, "nome": "João", "cpf": "123.456.789-00", "valor": 100.00 }
    ]
  }
}
```

**Errors:**
- `400` - Arquivo inválido / formato errado
- `413` - Arquivo muito grande
- `500` - Erro ao processar

---

### 3.3 POST - Gerar Crédito

**Endpoint:** `POST /api/creditos/gerar`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Body:**
```json
{
  "colaboradores": [
    {
      "id": 1,
      "valor": 100.00
    },
    {
      "id": 2,
      "valor": 150.00
    }
  ],
  "tipo_credito": "Crédito Manual",
  "descricao": "Bônus mensal",
  "data_credito": "2026-03-09",
  "aplicar_mesmo_valor": false
}
```

**Validações:**
- Mínimo 1 colaborador
- Valor > 0
- Colaborador deve existir e estar ATIVO
- Não permitir duplicatas (mesmo colaborador 2x)

**Response (201):**
```json
{
  "success": true,
  "message": "Crédito gerado com sucesso",
  "data": {
    "remessa_id": 12345,
    "total_colaboradores": 2,
    "valor_total": 250.00,
    "data_criacao": "2026-03-09T14:30:00Z",
    "criado_por": "usuario@example.com"
  }
}
```

**Errors:**
- `400` - Dados inválidos
- `409` - Duplicatas encontradas
- `500` - Erro ao gerar crédito

---

### 3.4 GET - Histórico de Gerações

**Endpoint:** `GET /api/creditos/historico`

**Query Params:**
- `limit=50&offset=0`
- `data_inicio=2026-01-01`
- `data_fim=2026-03-09`
- `tipo_credito=`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "remessa_id": 12345,
      "data_criacao": "2026-03-09T14:30:00Z",
      "total_colaboradores": 2,
      "valor_total": 250.00,
      "tipo_credito": "Crédito Manual",
      "criado_por": "usuario@example.com"
    }
  ],
  "total": 5,
  "page": 0,
  "limit": 50
}
```

---

## 4. BANCO DE DADOS - QUERIES SQL

### 4.1 Buscar Colaboradores Ativos

```sql
SELECT 
  u.crd_usr_id as id,
  u.crd_usr_nome as nome,
  u.crd_usr_cpf as cpf,
  c.crd_cli_nome_fantasia as restaurante,
  u.crd_categoria as categoria,
  s.crd_sit_situacao as status
FROM crd_usuario u
INNER JOIN crd_cliente c ON c.crd_cli_id = u.crd_cli_id
INNER JOIN crd_situacao s ON s.crd_sit_id = u.crd_sit_id
WHERE u.crd_sit_id = 1
  AND (u.crd_usr_nome ILIKE $1 OR u.crd_usr_cpf LIKE $2)
  AND ($3::INTEGER IS NULL OR u.crd_categoria = $3)
ORDER BY u.crd_usr_nome
LIMIT $4 OFFSET $5
```

### 4.2 Inserir Crédito

```sql
INSERT INTO crd_usuario_credito (
  crd_usr_id,
  crd_usu_valor,
  crd_usu_data_credito,
  crd_usucrerem_id,
  crd_tipo_credito,
  crd_descricao,
  crd_usuario_criacao
) VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING crd_usucre_id
```

### 4.3 Gerar Remessa ID

```sql
INSERT INTO crd_usuario_credito_remessa (
  crd_cli_id,
  crd_usu_valor_bruto,
  crd_usu_data_criacao,
  crd_tipo_credito
) VALUES ($1, $2, NOW(), $3)
RETURNING crd_usucrerem_id
```

---

## 5. COMPONENTES REACT

### 5.1 Estrutura de Pastas

```
src/
├── components/
│   ├── CreditoForm.jsx          # Componente principal
│   ├── TabImportarExcel.jsx     # Aba importação
│   ├── TabSelecaoManual.jsx     # Aba seleção manual
│   ├── PreviewCredito.jsx       # Preview antes de gerar
│   ├── TableColaboradores.jsx   # Tabela com checkboxes
│   └── HistoricoCreditos.jsx    # Histórico de gerações
├── services/
│   └── api.js                   # Chamadas HTTP (fetch/axios)
├── hooks/
│   ├── useFetchColaboradores.js # Hook customizado
│   └── useCredito.js            # Lógica de crédito
├── styles/
│   └── credito.css              # Estilos específicos
└── pages/
    └── CreditoPage.jsx          # Página principal
```

### 5.2 Componentes Detalhados

#### **CreditoForm.jsx**
- Gerenciador de estado (useState)
- Navegação entre abas (Importar vs Manual)
- Renderiza TabImportarExcel ou TabSelecaoManual
- Exibe PreviewCredito após seleção
- Botão "Gerar Crédito" principal

#### **TabImportarExcel.jsx**
- Input file (.xlsx)
- Validação de arquivo
- Preview dos dados importados
- Botão "Importar" (chama `/api/colaboradores/import`)
- Exibe erros de importação

#### **TabSelecaoManual.jsx**
- Filtros: busca, status, categoria
- Chama `GET /api/colaboradores`
- Componente TableColaboradores com checkboxes
- Botões "Selecionar Todos" / "Desselecionar Todos"

#### **TableColaboradores.jsx**
- Tabela com dados
- Colunas: checkbox | ID | Nome | CPF | Restaurante | Categoria
- Paginação (limite 50/100 por página)
- Ordernação por coluna
- Linha destacada ao hover

#### **PreviewCredito.jsx**
- Exibe colaboradores selecionados
- Campo "Valor de Crédito" (máscara R$)
- Checkbox "Aplicar mesmo valor para todos"
- Select "Tipo de Crédito"
- Campo "Descrição" (opcional)
- Resumo: Total de colaboradores + Valor Total
- Botão "Gerar Crédito" (POST `/api/creditos/gerar`)

#### **HistoricoCreditos.jsx**
- Tabela com gerações passadas
- Filtros por data/tipo
- Exibe: Data | Total | Valor | Tipo | Criado por

---

## 6. FLUXOS DE INTERFACE

### Fluxo 1: Importar Excel
1. Usuário clica ABA "Importar Excel"
2. Seleciona arquivo .xlsx
3. Sistema valida e mostra preview (erro/linhas)
4. Confirma importação → `/api/colaboradores/import`
5. Exibe tabela de seleção com dados importados
6. Seleciona colaboradores via checkbox
7. Vai para PreviewCredito
8. Clica "Gerar Crédito" → POST `/api/creditos/gerar`
9. Sucesso: exibe toast + recarrega histórico

### Fluxo 2: Seleção Manual
1. Usuário clica ABA "Seleção Manual"
2. Sistema carrega colaboradores ATIVOS → `GET /api/colaboradores`
3. Usuário aplica filtros (busca, categoria)
4. Seleciona via checkboxes
5. Clica "Próximo" → PreviewCredito
6. Define valor/descrição
7. Clica "Gerar Crédito" → POST `/api/creditos/gerar`
8. Sucesso: toast + histórico atualizado

---

## 7. VALIDAÇÕES FRONTEND

- [ ] Arquivo Excel válido (.xlsx)
- [ ] Mínimo 1 colaborador selecionado
- [ ] Valor de crédito > 0
- [ ] Não permitir valores muito altos (ex: > R$ 100.000)
- [ ] CPF válido (formato básico)
- [ ] Data não pode ser no futuro
- [ ] Descrição máximo 255 caracteres

---

## 8. VALIDAÇÕES BACKEND

- [ ] Autenticação do usuário (JWT/token)
- [ ] Colaborador existe e está ATIVO
- [ ] Não duplicar mesmos colaboradores na mesma requisição
- [ ] Valor > 0 e formato numérico válido
- [ ] Arquivo .xlsx válido
- [ ] Máximo 5000 linhas no Excel
- [ ] CPF válido (regex + validação)
- [ ] Rate limiting (prevent spam)
- [ ] Logging de todas as gerações

---

## 9. TRATAMENTO DE ERROS

### Frontend
- Toast notifications (sucesso/erro/aviso)
- Modal de erro com detalhes
- Retry automático para falhas de rede
- Desabilitar botões durante requisição

### Backend
- Respostas HTTP padronizadas (200/201/400/401/500)
- Mensagens de erro claras
- Logging completo
- Transações no banco (rollback se falhar)

---

## 10. SEGURANÇA

- [ ] Validar JWT/token em todos endpoints
- [ ] Sanitizar inputs (SQL injection)
- [ ] CORS configurado corretamente
- [ ] Rate limiting por usuário
- [ ] Validar CPF antes de inserir
- [ ] Logs de auditoria (quem gerou, quando, quanto)
- [ ] Não expor IDs internos em resposta

---

## 11. PERFORMANCE

- [ ] Paginação no ListaColaboradores (50/100 por página)
- [ ] Debounce na busca (300ms)
- [ ] Cache de colaboradores em LocalStorage (opcional)
- [ ] Lazy loading de histórico
- [ ] Compressão de arquivo Excel

---

## 12. TESTES

### Frontend (Jest/React Testing Library)
- [ ] Teste importação de Excel
- [ ] Teste filtros de colaboradores
- [ ] Teste seleção/deseleção de checkboxes
- [ ] Teste cálculo de total
- [ ] Teste validações

### Backend (Jest/Supertest)
- [ ] Teste GET /api/colaboradores (com filtros)
- [ ] Teste POST /api/colaboradores/import
- [ ] Teste POST /api/creditos/gerar
- [ ] Teste validações
- [ ] Teste casos de erro

---

## 13. DEPENDÊNCIAS

### Frontend (React)
```json
{
  "react": "^18.x",
  "react-dom": "^18.x",
  "axios": "^1.x",
  "react-toastify": "^9.x",
  "xlsx": "^0.18.x",
  "react-icons": "^4.x"
}
```

### Backend (Node.js)
```json
{
  "express": "^4.x",
  "pg": "^8.x",
  "multer": "^1.x",
  "xlsx": "^0.18.x",
  "dotenv": "^16.x",
  "cors": "^2.x",
  "helmet": "^7.x",
  "jsonwebtoken": "^9.x"
}
```

---

## 14. VARIÁVEIS DE AMBIENTE

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

### Backend (.env)
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco
DB_USER=user
DB_PASSWORD=senha
JWT_SECRET=sua_chave_secreta
NODE_ENV=development
LOG_LEVEL=info
```

---

## 15. ENTREGA

### Frontend
- [ ] Arquivos React prontos
- [ ] Estilos CSS (Tailwind ou custom)
- [ ] Hooks customizados
- [ ] Documentação de componentes
- [ ] Testes com cobertura mínima 80%

### Backend
- [ ] APIs REST funcionando
- [ ] Validações completas
- [ ] Queries SQL otimizadas
- [ ] Logging e tratamento de erros
- [ ] Testes unitários e integração
- [ ] README.md com instruções

### Documentação
- [ ] Swagger/OpenAPI da API
- [ ] Instruções de setup
- [ ] Fluxos de uso
- [ ] Troubleshooting

---

## 16. TIMELINE ESTIMADA

- **Frontend:** 2-3 dias
- **Backend:** 2-3 dias
- **Integração:** 1 dia
- **Testes:** 2 dias
- **Deploy:** 1 dia

**Total: 1-2 semanas**

---

## 17. NOTAS IMPORTANTES

1. **Banco de Dados:** Usar PostgreSQL existente (não criar novo)
2. **Autenticação:** Integrar com sistema de auth já existente
3. **Auditoria:** Registrar quem criou cada crédito e quando
4. **Rollback:** Se falhar no meio, reverter tudo (transação)
5. **Performance:** Não carregar todos colaboradores de uma vez

---

**Pronto para compartilhar com outra IA! 🚀**
