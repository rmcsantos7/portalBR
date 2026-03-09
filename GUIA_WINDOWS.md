# 🪟 GUIA COMPLETO - RODAR NO WINDOWS

## ✅ Pré-requisitos (Instalar antes)

### 1. Node.js
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS** (recomendado)
3. Execute o instalador
4. Clique "Next" até o final
5. **Importante:** Marque "Add to PATH"

**Verificar instalação:**
```cmd
node --version
npm --version
```

Deve exibir versões (ex: v18.x.x)

---

### 2. PostgreSQL (Banco de Dados)

1. Acesse: https://www.postgresql.org/download/windows/
2. Baixe a versão mais recente
3. Execute o instalador
4. Preencha:
   - **Port:** 5432 (padrão)
   - **Password:** (defina uma senha segura, ex: `postgres123`)
   - **Username:** postgres (padrão)

5. **Importante:** Anote a senha! Você vai precisar

**Verificar instalação:**
```cmd
psql --version
```

---

### 3. Git (Opcional, mas recomendado)

1. Acesse: https://git-scm.com/download/win
2. Instale com padrões

---

## 📁 Criar Pastas do Projeto

### Opção A: Via Explorer
1. Crie pasta em `C:\Dev` ou onde preferir
2. Exemplo: `C:\Dev\geracao-credito\`
3. Dentro crie: `api` e `frontend`

### Opção B: Via CMD
```cmd
mkdir C:\Dev\geracao-credito
cd C:\Dev\geracao-credito
mkdir api
mkdir frontend
```

---

## 🔧 Copiar Arquivos

### Backend
1. Copie todos os arquivos da pasta `/api` para `C:\Dev\geracao-credito\api\`
2. Estrutura deve ser:
```
C:\Dev\geracao-credito\api\
├── src\
├── package.json
├── .env.example
└── README.md
```

### Frontend
1. Copie todos os arquivos da pasta `/frontend` para `C:\Dev\geracao-credito\frontend\`
2. Estrutura deve ser:
```
C:\Dev\geracao-credito\frontend\
├── src\
├── package.json
├── .env.example
└── README.md
```

---

## 🗄️ Configurar Banco de Dados

### 1. Abra pgAdmin (Programa PostgreSQL)

1. Pressione `Win + R`
2. Digite: `pgAdmin`
3. Abra no navegador (geralmente http://localhost:5050)
4. Login com usuário postgres

### 2. Crie o Banco de Dados

1. Clique com botão direito em "Databases"
2. Selecione "Create" → "Database"
3. Name: `seu_banco_brg` (exemplo)
4. Owner: `postgres`
5. Clique "Save"

### 3. Verifique Conexão (CMD)

```cmd
psql -U postgres -h localhost -d seu_banco_brg
```

Se conectar, digitar `\q` para sair.

---

## ⚙️ Configurar Backend

### 1. Abra Terminal/PowerShell

Pressione `Win + R`, digite `powershell` e Enter

### 2. Navegue para a pasta

```powershell
cd C:\Dev\geracao-credito\api
```

### 3. Instale dependências

```powershell
npm install
```

Vai baixar ~200MB (leva 2-5 minutos)

### 4. Configure o .env

Abra com Bloco de Notas:
```powershell
notepad .env
```

**Copie e Cole isto, adaptando:**

```env
# ===== SERVIDOR =====
PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# ===== BANCO DE DADOS =====
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco_brg
DB_USER=postgres
DB_PASSWORD=postgres123

# ===== SEGURANÇA =====
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=sua_chave_secreta_bem_longa_aqui_123

# ===== UPLOAD =====
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

**Adapte:**
- `DB_NAME` - nome do banco que criou
- `DB_PASSWORD` - senha que você definiu no PostgreSQL

Salve o arquivo (Ctrl + S)

### 5. Inicie o servidor

```powershell
npm run dev
```

✅ Deve aparecer:
```
🚀 Servidor rodando na porta 3001
✅ Conexão com banco de dados estabelecida
```

Se houver erro na conexão, volte para a configuração do `.env`

---

## ⚛️ Configurar Frontend

### 1. Abra Outro Terminal/PowerShell

Pressione `Win + R`, digite `powershell` e Enter novamente

### 2. Navegue para a pasta

```powershell
cd C:\Dev\geracao-credito\frontend
```

### 3. Instale dependências

```powershell
npm install
```

Vai leva 3-5 minutos

### 4. Configure o .env (Opcional)

```powershell
notepad .env
```

Deixe como está:
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

Salve

### 5. Inicie o app

```powershell
npm start
```

✅ Deve abrir automaticamente em `http://localhost:3000`

---

## 🌐 Testar Aplicação

### 1. Abra no navegador

Vá para:
```
http://localhost:3000/?cliente_id=1
```

⚠️ **Importante:** `cliente_id=1` deve existir no seu banco!

Se vir erro, veja a seção **Troubleshooting** abaixo

### 2. Teste os fluxos

**Fluxo 1: Seleção Manual**
1. Clique aba "Seleção Manual"
2. Selecione colaboradores
3. Clique "Próximo"
4. Preencha dados do crédito
5. Clique "Gerar Crédito"

**Fluxo 2: Importar Excel**
1. Clique aba "Importar Excel"
2. Crie arquivo Excel com:
   - Coluna A: nome
   - Coluna B: cpf
   - Coluna C: valor
3. Selecione arquivo
4. Clique "Importar Arquivo"
5. Clique "Próximo" e "Gerar Crédito"

---

## 🆘 Troubleshooting

### ❌ "Porta 3001 já está em uso"

**Solução:**
```powershell
# Encontre o processo
netstat -ano | findstr :3001

# Mate o processo (substitua PID)
taskkill /PID 12345 /F
```

Ou altere a porta em `.env`:
```
PORT=3002
```

---

### ❌ "Não consegue conectar ao banco"

**Verifique:**

1. PostgreSQL está rodando?
```powershell
# Abra Services (Win + R -> services.msc)
# Procure "postgresql-x64-14" e veja se está "Running"
```

2. Credenciais estão corretas?
```powershell
psql -U postgres -h localhost
# Se pedir senha, Digite a senha que você definiu
```

3. Banco existe?
```powershell
psql -U postgres -h localhost -l
# Deve aparecer seu banco na lista
```

---

### ❌ "npm install não funciona"

**Tente:**

```powershell
# Limpe cache
npm cache clean --force

# Delete pasta node_modules
rmdir node_modules -Recurse -Force

# Instale novamente
npm install
```

---

### ❌ "cliente_id=1 não existe"

**Solução:**

1. Abra pgAdmin
2. No seu banco, execute:
```sql
SELECT * FROM crd_cliente LIMIT 1;
```

3. Use um ID que existe:
```
http://localhost:3000/?cliente_id=123
```

---

### ❌ "React não carrega"

Verifique se:
1. Backend está rodando (Terminal 1 ainda ativo?)
2. Não há erro no console do navegador (F12)
3. URL está correta: `http://localhost:3000/?cliente_id=1`

---

## 📋 Estrutura de Pastas (Windows)

```
C:\Dev\geracao-credito\
│
├── api\
│   ├── src\
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config\
│   │   ├── controllers\
│   │   ├── services\
│   │   ├── repositories\
│   │   ├── routes\
│   │   ├── middlewares\
│   │   └── utils\
│   ├── package.json
│   ├── .env          ← Seu arquivo (não envie)
│   ├── .env.example
│   └── README.md
│
└── frontend\
    ├── src\
    │   ├── App.jsx
    │   ├── components\
    │   ├── hooks\
    │   ├── pages\
    │   ├── services\
    │   └── styles\
    ├── public\
    ├── package.json
    ├── .env          ← Seu arquivo (não envie)
    ├── .env.example
    └── README.md
```

---

## ⚡ Atalhos Úteis (Windows)

### PowerShell

```powershell
# Voltar pasta
cd ..

# Listar arquivos
dir

# Abrir pasta no Explorer
explorer .

# Parar servidor (Ctrl + C)
# Quando solicitado, pressione "S"
```

---

## 🔄 Workflow Diário

### Toda vez que vai usar:

**Terminal 1 (Backend):**
```powershell
cd C:\Dev\geracao-credito\api
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd C:\Dev\geracao-credito\frontend
npm start
```

**Navegador:**
```
http://localhost:3000/?cliente_id=1
```

---

## 📝 Checklist de Configuração

- [ ] Node.js instalado
- [ ] PostgreSQL instalado
- [ ] Banco de dados criado
- [ ] Arquivos copiados para `C:\Dev\geracao-credito\`
- [ ] `.env` configurado no backend
- [ ] `npm install` executado em ambas pastas
- [ ] Backend rodando em `localhost:3001`
- [ ] Frontend rodando em `localhost:3000`
- [ ] App carrega com `?cliente_id=1`
- [ ] Testar fluxo seleção manual
- [ ] Testar fluxo importar Excel

---

## 🎯 Próximas Etapas

1. **Hoje:** Instale tudo e teste localmente
2. **Amanhã:** Crie Excel com dados reais e teste
3. **Depois:** Valide no banco com SQL
4. **Deploy:** Use Heroku/Vercel quando estiver pronto

---

## 💡 Dicas Windows

### Deixar Terminais Abertos

Não feche os terminais enquanto estiver testando. Se fechar:

1. Terminal do backend fecha
2. API fica indisponível
3. Frontend mostra erro de conexão

**Solução:** Use 2 terminais/abas diferentes

### Editar .env Facilmente

```powershell
# Abrir com Bloco de Notas
notepad .env

# Abrir com VSCode (se tiver)
code .env

# Abrir com outro editor
start .env
```

### Instalar VSCode (Opcional)

```powershell
# Baixe em: https://code.visualstudio.com/
# Instale e use
code C:\Dev\geracao-credito
```

Muito mais fácil editar e rodar tudo!

---

## 📞 Se Ficar Preso

1. Verifique o **Troubleshooting** acima
2. Veja logs no terminal (mensagens de erro)
3. Confira as credenciais do `.env`
4. Reinicie PostgreSQL
5. Delete `node_modules` e `npm install` novamente

---

**Pronto! Você está configurado para rodar no Windows! 🚀**

Qualquer dúvida durante a configuração, é só chamar!
