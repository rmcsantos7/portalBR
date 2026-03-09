# 🧪 Exemplos de Uso e Testes

## Exemplos de Requisições HTTP

### 1. Listar Colaboradores

#### Request
```
GET /api/colaboradores?cliente_id=1&search=&categoria=&limit=50&offset=0
Host: localhost:3001
```

#### Response (200 OK)
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
    },
    {
      "id": 2,
      "nome": "Maria Santos",
      "cpf": "98765432100",
      "restaurante": "Restaurante A",
      "categoria": "Atendente",
      "status": "ATIVO"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0,
  "page": 0
}
```

---

### 2. Obter Categorias

#### Request
```
GET /api/colaboradores/categorias?cliente_id=1
Host: localhost:3001
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    "Gerente",
    "Atendente",
    "Cozinheiro",
    "Sem categoria"
  ]
}
```

---

### 3. Importar Arquivo Excel

#### Request
```
POST /api/colaboradores/import?cliente_id=1
Host: localhost:3001
Content-Type: multipart/form-data

[arquivo.xlsx]
```

#### Formato do Excel
```
| nome          | cpf         | valor | categoria  |
|---------------|-------------|-------|-----------|
| João Silva    | 123.456.789-00 | 100.00 | Gerente  |
| Maria Santos  | 987.654.321-00 | 150.00 | Atendente|
| Pedro Oliveira| 111.222.333-44 | 120.00 | Cozinha  |
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total_importados": 3,
    "total_erros": 0,
    "erros": [],
    "colaboradores": [
      {
        "nome": "João Silva",
        "cpf": "12345678900",
        "valor": 100.00,
        "categoria": "Gerente"
      },
      {
        "nome": "Maria Santos",
        "cpf": "98765432100",
        "valor": 150.00,
        "categoria": "Atendente"
      },
      {
        "nome": "Pedro Oliveira",
        "cpf": "11122233344",
        "valor": 120.00,
        "categoria": "Cozinha"
      }
    ]
  }
}
```

---

### 4. Gerar Crédito

#### Request
```
POST /api/creditos/gerar?cliente_id=1
Host: localhost:3001
Content-Type: application/json

{
  "colaboradores": [
    {
      "id": 1,
      "valor": 100.00
    },
    {
      "id": 2,
      "valor": 150.00
    },
    {
      "id": 3,
      "valor": 120.00
    }
  ],
  "tipo_credito": "Crédito Manual",
  "descricao": "Bônus de desempenho - Março/2026",
  "data_credito": "2026-03-09",
  "aplicar_mesmo_valor": false
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Crédito gerado com sucesso para 3 colaborador(es)",
  "data": {
    "remessa_id": 12345,
    "total_colaboradores": 3,
    "valor_total": 370.00,
    "data_criacao": "2026-03-09T14:30:00.000Z",
    "criado_por": "sistema"
  }
}
```

---

### 5. Listar Histórico

#### Request
```
GET /api/creditos/historico?cliente_id=1&limit=50&offset=0&tipo_credito=&data_inicio=2026-03-01&data_fim=2026-03-09
Host: localhost:3001
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "remessa_id": 12345,
      "data_criacao": "2026-03-09T14:30:00.000Z",
      "total_colaboradores": 3,
      "valor_total": "370.00",
      "tipo_credito": "Crédito Manual",
      "criado_por": "usuario@empresa.com"
    },
    {
      "remessa_id": 12344,
      "data_criacao": "2026-03-08T10:15:00.000Z",
      "total_colaboradores": 5,
      "valor_total": "750.00",
      "tipo_credito": "Bônus",
      "criado_por": "sistema"
    }
  ],
  "total": 20,
  "limit": 50,
  "offset": 0,
  "page": 0
}
```

---

### 6. Obter Tipos de Crédito

#### Request
```
GET /api/creditos/tipos
Host: localhost:3001
```

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    "Crédito Manual",
    "Promoção",
    "Bônus",
    "Ajuste",
    "Reembolso"
  ]
}
```

---

## 🔴 Exemplos de Erros

### Erro 400 - Validação

#### Request
```json
{
  "colaboradores": [],
  "tipo_credito": "Crédito Manual"
}
```

#### Response (400 Bad Request)
```json
{
  "success": false,
  "error": "Mínimo 1 colaborador é obrigatório",
  "details": {
    "campo": "colaboradores"
  },
  "timestamp": "2026-03-09T14:30:00.000Z"
}
```

---

### Erro 401 - Não Autenticado

#### Response (401 Unauthorized)
```json
{
  "success": false,
  "error": "Não autenticado",
  "timestamp": "2026-03-09T14:30:00.000Z"
}
```

---

### Erro 409 - Colaboradores Duplicados

#### Request
```json
{
  "colaboradores": [
    {"id": 1, "valor": 100},
    {"id": 1, "valor": 50}
  ],
  "tipo_credito": "Crédito Manual"
}
```

#### Response (409 Conflict)
```json
{
  "success": false,
  "error": "Colaboradores duplicados encontrados",
  "details": {
    "duplicatas": [1]
  },
  "timestamp": "2026-03-09T14:30:00.000Z"
}
```

---

### Erro 500 - Erro do Servidor

#### Response (500 Internal Server Error)
```json
{
  "success": false,
  "error": "Erro interno do servidor",
  "timestamp": "2026-03-09T14:30:00.000Z"
}
```

---

## 📝 Casos de Teste

### Teste 1: Fluxo Seleção Manual Completo

```
1. Acesse: http://localhost:3000/?cliente_id=1
2. Clique na aba "Seleção Manual"
3. Aguarde carregar colaboradores
4. Selecione 3 colaboradores via checkbox
5. Clique "Próximo"
6. Preencha:
   - Tipo de Crédito: "Crédito Manual"
   - Data: 2026-03-09
   - Valor (se usar mesmo valor): 100.00
   - Descrição: "Teste manual"
7. Clique "Gerar Crédito"
8. Confirme sucesso no histórico
```

**Esperado:** ✅ Crédito gerado com sucesso

---

### Teste 2: Importar Excel

```
1. Crie arquivo Excel com 5 colaboradores:
   - Colunas: nome, cpf, valor, categoria
   - Valores válidos (CPF com 11 dígitos)
   
2. Clique aba "Importar Excel"
3. Selecione o arquivo
4. Clique "Importar Arquivo"
5. Revise resultado (total_importados = 5)
6. Clique "Próximo"
7. Preencha dados do crédito
8. Clique "Gerar Crédito"
```

**Esperado:** ✅ 5 colaboradores com crédito gerado

---

### Teste 3: Validação de CPF Inválido

```
1. Crie Excel com CPF inválido:
   - João Silva | 123.456.789-00 | 100.00
   (CPF com 11 dígitos válidos)

2. Crie com CPF inválido:
   - Maria | 111.222.333 | 100.00
   (CPF com menos de 11 dígitos)

3. Importe o arquivo
```

**Esperado:** ✅ Maria marcada como erro, João importado

---

### Teste 4: Validação de Valor Negativo

```
1. Crie Excel:
   - João | 123.456.789-00 | -100.00
   - Maria | 987.654.321-00 | 0

2. Importe
```

**Esperado:** ❌ Ambas marcadas como erro (valor deve ser positivo)

---

### Teste 5: Aplicar Mesmo Valor para Todos

```
1. Selecione 5 colaboradores
2. Vá para preview
3. Marque "Aplicar mesmo valor para todos"
4. Digite: 50.00
5. Gerar crédito
```

**Esperado:** ✅ Todos recebem R$ 50.00 (total: R$ 250.00)

---

### Teste 6: Filtro por Categoria

```
1. Clique "Seleção Manual"
2. Selecione categoria "Gerente"
3. Verifica se apenas gerentes aparecem
4. Altere para "Atendente"
5. Verifica se apenas atendentes aparecem
```

**Esperado:** ✅ Filtro funciona corretamente

---

### Teste 7: Busca por Nome

```
1. Clique "Seleção Manual"
2. Digite "João" no campo de busca
3. Aguarde resultado (debounce 300ms)
4. Verifica se apenas "João*" aparecem
5. Limpe busca e digite "Silva"
```

**Esperado:** ✅ Busca retorna resultados corretos

---

### Teste 8: Histórico de Gerações

```
1. Gere 3 créditos diferentes (tipos diferentes)
2. Verifique histórico na página
3. Filtre por tipo_credito
4. Filtre por data
5. Verificar paginação
```

**Esperado:** ✅ Histórico mostra todas as gerações com filtros funcionando

---

### Teste 9: Validação de Arquivo Inválido

```
1. Tente importar arquivo .txt
2. Tente importar arquivo > 10MB
3. Tente importar Excel vazio
```

**Esperado:** ❌ Todos rejeitados com mensagem clara

---

### Teste 10: Cliente_id Inválido

```
1. Acesse: http://localhost:3000/?cliente_id=999999
   (ID que não existe)
2. Verifica se carrega vazio (0 colaboradores)

3. Acesse: http://localhost:3000/?cliente_id=abc
   (ID inválido)
4. Verifica se exibe erro
```

**Esperado:** ✅ Trata erro corretamente

---

## 🔍 Comandos SQL para Testes

### Verificar Crédito Gerado

```sql
SELECT * 
FROM crd_usuario_credito
WHERE crd_usucrerem_id = 12345
ORDER BY crd_usr_id;
```

### Verificar Remessa

```sql
SELECT * 
FROM crd_usuario_credito_remessa
WHERE crd_usucrerem_id = 12345;
```

### Total de Crédito por Colaborador

```sql
SELECT 
  u.crd_usr_id,
  u.crd_usr_nome,
  SUM(c.crd_usu_valor) as total_credito
FROM crd_usuario_credito c
INNER JOIN crd_usuario u ON c.crd_usr_id = u.crd_usr_id
GROUP BY u.crd_usr_id, u.crd_usr_nome
ORDER BY total_credito DESC;
```

### Histórico Completo

```sql
SELECT 
  r.crd_usucrerem_id,
  r.crd_usu_data_criacao,
  COUNT(c.crd_usucre_id) as total_colabs,
  SUM(c.crd_usu_valor) as valor_total,
  r.crd_tipo_credito,
  r.crd_usuario_criacao
FROM crd_usuario_credito_remessa r
LEFT JOIN crd_usuario_credito c ON c.crd_usucrerem_id = r.crd_usucrerem_id
GROUP BY r.crd_usucrerem_id
ORDER BY r.crd_usu_data_criacao DESC;
```

---

## 🎯 Checklist de Testes Antes de Deploy

- [ ] Teste 1: Fluxo Seleção Manual ✅
- [ ] Teste 2: Importar Excel ✅
- [ ] Teste 3: Validação CPF ✅
- [ ] Teste 4: Validação Valor ✅
- [ ] Teste 5: Mesmo Valor ✅
- [ ] Teste 6: Filtro Categoria ✅
- [ ] Teste 7: Busca por Nome ✅
- [ ] Teste 8: Histórico ✅
- [ ] Teste 9: Arquivo Inválido ✅
- [ ] Teste 10: Cliente_id Inválido ✅
- [ ] Teste de Carga (1000+ requisições) ✅
- [ ] Teste CORS ✅
- [ ] Teste SSL/HTTPS ✅

---

**Versão:** 1.0.0  
**Última atualização:** 2026-03-09
