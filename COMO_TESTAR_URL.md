# 🌐 COMO TESTAR URL NO SEU PC - GUIA COMPLETO

## 📋 Resumo Rápido

Você vai rodar **2 servidores** no seu PC:
1. **Backend** (Node.js) - porta 3001
2. **Frontend** (React) - porta 3000

Depois acessa:
```
http://localhost:3000/?cliente_id=1
```

---

## 🚀 PASSO A PASSO COMPLETO

### **PASSO 1: Abrir PowerShell (ou CMD)**

Aperte `Win + R` e digite:
```
powershell
```

Ou clique em `Iniciar` → `Windows PowerShell`

---

### **PASSO 2: Ir para a pasta do Backend**

```powershell
cd C:\Projetos\api
```

Se não conseguir, rode:
```powershell
C:
cd Projetos\api
```

Confirme digitando:
```powershell
ls
```

Deve aparecer:
```
package.json
src
.env.example
```

---

### **PASSO 3: Configurar o Backend (.env)**

Se ainda não tem `.env`, crie:

```powershell
cp .env.example .env
```

Abra com Notepad:
```powershell
notepad .env
```

Edite com suas credenciais:
```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=seu_banco_brg
DB_USER=postgres
DB_PASSWORD=sua_senha
CORS_ORIGIN=http://localhost:3000
```

**Salve (Ctrl+S) e feche**

---

### **PASSO 4: Instalar dependências (Backend)**

Ainda no PowerShell, na pasta `api`:

```powershell
npm install
```

Vai demorar 2-3 minutos... Paciência! ⏳

Quando terminar, deve dizer:
```
added XXX packages
```

---

### **PASSO 5: Rodar o Backend**

```powershell
npm run dev
```

**Deve aparecer:**
```
🚀 Servidor rodando na porta 3001
✅ Conexão com banco de dados estabelecida
Aguardando requisições...
```

**⚠️ NÃO FECHE ESTE TERMINAL!**

---

### **PASSO 6: Abrir OUTRO PowerShell (novo)**

Não feche o primeiro! Abra outro:

1. Aperte `Win + R`
2. Digite `powershell`
3. Clique OK

Agora tem **2 PowerShells** abertos:
- **PowerShell 1**: Backend rodando (não feche!)
- **PowerShell 2**: Para o Frontend

---

### **PASSO 7: Ir para a pasta do Frontend**

No **PowerShell 2** (novo):

```powershell
cd C:\Projetos\frontend
```

Confirme:
```powershell
ls
```

Deve aparecer:
```
package.json
src
public
```

---

### **PASSO 8: Instalar dependências (Frontend)**

```powershell
npm install
```

Vai demorar 2-3 minutos também...

---

### **PASSO 9: Rodar o Frontend**

```powershell
npm start
```

**Deve aparecer:**
```
Compiled successfully!

You can now view the app in your browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.X.X:3000
```

Pode abrir o navegador automaticamente, ou deixa para o próximo passo.

---

### **PASSO 10: Abrir o Navegador**

Na barra de endereço, digite:

```
http://localhost:3000/?cliente_id=1
```

**ENTER!** 🎉

---

## ✅ Checklist - Tudo Funcionando?

- [ ] PowerShell 1 mostra "Servidor rodando na porta 3001"
- [ ] PowerShell 2 mostra "Compiled successfully!"
- [ ] Navegador abre a página
- [ ] Página mostra "Geração de Crédito"
- [ ] Consegue selecionar colaboradores
- [ ] Consegue clicar "Próximo"

Se tudo OK → **Você está pronto!** ✅

---

## 🆘 Se Algo Não Funcionar

### ❌ "Erro: Porto 3000/3001 já em uso"

**Solução 1:** Mude a porta no `.env`:
```env
PORT=3002
```

Ou feche o programa que está usando a porta.

**Solução 2:** Ver quem está usando a porta:
```powershell
netstat -ano | findstr :3001
```

---

### ❌ "Erro: npm não encontrado"

**Solução:** Instale Node.js
1. Vá em https://nodejs.org
2. Baixe a versão **LTS** (a mais estável)
3. Instale clicando "Next" várias vezes
4. Abra novo PowerShell e tente de novo

---

### ❌ "Erro: node_modules não encontrado"

**Solução:**
```powershell
npm install
```

---

### ❌ "Erro: Can't resolve './CreditoForm.css'"

**Solução:** Seu ZIP está desatualizado
1. Baixe o **novo ZIP** atualizado
2. Delete a pasta `frontend`
3. Extraia a nova pasta
4. Rode `npm install` de novo

---

### ❌ "Erro ao conectar ao banco"

**Solução:** Verifique `.env`
```powershell
notepad .env
```

Confirme:
- `DB_HOST=localhost` (ou seu IP)
- `DB_PORT=5432` (padrão PostgreSQL)
- `DB_NAME=seu_banco` (nome correto)
- `DB_USER=postgres` (usuario correto)
- `DB_PASSWORD=sua_senha` (senha correta)

Se não sabe a senha, entre em contato com seu DBA ou tente `postgres` (padrão).

---

## 🎯 Teste a URL de Diferentes Formas

### Forma 1: Localhost (seu PC)
```
http://localhost:3000/?cliente_id=1
```
**Funciona:** Apenas no seu PC ✅

### Forma 2: IP local (outro PC na rede)
```
http://192.168.1.10:3000/?cliente_id=1
```
**Funciona:** De outro PC conectado na rede ✅

Para achar seu IP:
```powershell
ipconfig
```

Procure por `IPv4 Address:` - algo como `192.168.1.100`

### Forma 3: Nome da máquina
```
http://seu-computador:3000/?cliente_id=1
```
**Funciona:** Depende da rede 🤔

---

## 📱 Testar em Celular (mesmo WiFi)

Se quer testar no celular conectado no WiFi:

1. Achar seu IP (veja acima)
2. No celular, acesse:
```
http://192.168.1.10:3000/?cliente_id=1
```

Substitua `192.168.1.10` pelo seu IP real.

---

## 🔧 Comandos Úteis

### Ver se porta está em uso
```powershell
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

### Matar processo que usa a porta
```powershell
# Windows
taskkill /PID 1234 /F

# Ou simplesmente feche o PowerShell
```

### Limpar cache npm
```powershell
npm cache clean --force
```

### Reinstalar tudo (nuclear option)
```powershell
cd frontend
rm -r node_modules
npm install
npm start
```

---

## 🚀 Ordem Correta para Rodar

**Sempre nesta ordem:**

1. ✅ **Backend primeiro** (port 3001)
   ```powershell
   cd C:\Projetos\api
   npm run dev
   ```

2. ✅ **Frontend depois** (port 3000)
   ```powershell
   cd C:\Projetos\frontend
   npm start
   ```

3. ✅ **Acesse no navegador**
   ```
   http://localhost:3000/?cliente_id=1
   ```

---

## 📊 Estrutura de Rede

```
SEU PC
│
├─ Backend (localhost:3001)
│  └─ Node.js + Express
│  └─ API em http://localhost:3001/api
│
├─ Frontend (localhost:3000)
│  └─ React App
│  └─ Comunica com Backend
│
└─ Navegador
   └─ Acessa http://localhost:3000/?cliente_id=1
```

---

## ✨ Dicas Importantes

### 1. NÃO FECHE O POWERSHELL COM O BACKEND
Se fechar, o Backend cai e o Frontend não consegue dados.

Solução: Deixa ambos abertos lado a lado:
```
┌─ PowerShell 1: Backend (3001) ─┐
│ npm run dev                     │
├─────────────────────────────────┤
│ PowerShell 2: Frontend (3000)   │
│ npm start                       │
└─────────────────────────────────┘
```

### 2. Use `?cliente_id=` OBRIGATORIAMENTE
```
✅ http://localhost:3000/?cliente_id=1
❌ http://localhost:3000/          (sem cliente_id)
```

### 3. Limpe o cache do navegador (Ctrl+Shift+Delete)
Se algo não aparecer atualizado.

### 4. Abra DevTools (F12)
Procure por erros na aba "Console"

---

## 🎯 URL Padrão de Teste

Use sempre para testes:
```
http://localhost:3000/?cliente_id=1
```

Ou se tiver múltiplos clientes:
```
http://localhost:3000/?cliente_id=2
http://localhost:3000/?cliente_id=3
```

---

## 📸 Screenshot do que Deve Aparecer

### Terminal Backend
```
🚀 Servidor rodando na porta 3001
✅ Conexão com banco de dados estabelecida
GET /api/colaboradores 200 25ms
GET /api/creditos/historico 200 18ms
```

### Terminal Frontend
```
Compiled successfully!
You can now view the app in your browser.
Local: http://localhost:3000
```

### Navegador
```
╔════════════════════════════════╗
║   Geração de Crédito          ║
║ Selecione colaboradores...    ║
║ [Tabela com colaboradores]    ║
║ [Botão: Próximo →]            ║
╚════════════════════════════════╝
```

---

## 🎉 Pronto!

Você consegue acessar a URL quando:

✅ Backend rodando (3001)
✅ Frontend rodando (3000)
✅ Navegador mostra a página
✅ Consegue selecionar colaboradores

**Bora começar?** 🚀

---

**Última atualização:** 2026-03-09
**Status:** ✅ Testado e funcionando
