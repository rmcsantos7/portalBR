# Frontend React - Geração de Crédito

Interface web para geração de crédito em massa para colaboradores.

## 🚀 Instalação

### Pré-requisitos
- Node.js >= 14.0.0
- npm >= 6.0.0
- Git

### Passos

1. **Clone o repositório**
```bash
git clone <seu-repo>
cd frontend
```

2. **Instale dependências**
```bash
npm install
```

3. **Configure variáveis de ambiente**
```bash
cp .env.example .env
# Edite o arquivo .env se necessário
```

Conteúdo de `.env`:
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

4. **Inicie o servidor (desenvolvimento)**
```bash
npm start
```

O aplicativo estará rodando em `http://localhost:3000`

## 📋 Estrutura de Pastas

```
src/
├── App.jsx                     # Componente raiz
├── components/
│   ├── CreditoForm.jsx        # Componente principal
│   ├── TabSelecaoManual.jsx   # Aba de seleção manual
│   ├── TabImportarExcel.jsx   # Aba de import Excel
│   ├── PreviewCredito.jsx     # Preview e confirmação
│   ├── TableColaboradores.jsx # Tabela com checkboxes
│   └── HistoricoCreditos.jsx  # Histórico de gerações
├── hooks/
│   ├── useFetchColaboradores.js # Hook para buscar colaboradores
│   └── useCredito.js            # Hook para lógica de crédito
├── pages/
│   ├── CreditoPage.jsx        # Página principal
│   └── CreditoPage.css        # Estilos da página
├── services/
│   └── api.js                 # Configuração de chamadas HTTP
└── styles/
    └── CreditoForm.css        # Estilos globais
```

## 🎨 Como Usar

### Acessar a Aplicação

A aplicação requer um `cliente_id` na URL:

```
http://localhost:3000/?cliente_id=1
```

Ou:

```
http://localhost:3000/credito?cliente_id=123
```

Substitua `1` ou `123` pelo ID do cliente desejado.

### Fluxo Principal

#### 1. Seleção Manual
1. Acesse a página com `cliente_id`
2. Clique na aba "Seleção Manual"
3. Use filtros para buscar colaboradores (nome, categoria)
4. Selecione colaboradores com checkboxes
5. Clique "Próximo"
6. Preencha dados do crédito (tipo, data, descrição)
7. Confirme e gere

#### 2. Importar Excel
1. Clique na aba "Importar Excel"
2. Selecione arquivo .xlsx com colaboradores
3. Revise erros (se houver)
4. Clique "Próximo"
5. Preencha dados do crédito
6. Confirme e gere

## 🔗 Integração com Backend

Certifique-se de que:
1. API está rodando em `http://localhost:3001`
2. Variável `REACT_APP_API_URL` aponta para URL correta
3. CORS está configurado no backend

### Endpoints Usados
- `GET /api/colaboradores` - Lista colaboradores
- `GET /api/colaboradores/categorias` - Obtém categorias
- `POST /api/colaboradores/import` - Importa Excel
- `POST /api/creditos/gerar` - Gera crédito
- `GET /api/creditos/historico` - Histórico de gerações
- `GET /api/creditos/tipos` - Tipos de crédito

## 🔒 Segurança

### Implementado
- ✅ Validação de entrada cliente_id
- ✅ Sanitização de CPF e valores
- ✅ Proteção contra requisições não autenticadas
- ✅ Limitação de tamanho de arquivo
- ✅ Validação de formato Excel

### Requisitos Adicionais
- Token JWT (pronto para implementar)
- Proteção contra CSRF (pronto para implementar)

## 🧪 Testes

```bash
# Executar testes
npm test

# Build para produção
npm run build
```

## 📦 Build para Produção

```bash
npm run build
```

Gera pasta `build/` otimizada para deploy.

## 🚀 Deploy

### Opção 1: Vercel
```bash
npm install -g vercel
vercel
```

### Opção 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=build
```

### Opção 3: Manual
1. Execute `npm run build`
2. Copie pasta `build/` para seu servidor
3. Configure servidor para servir `index.html`

## 🔄 Variáveis de Ambiente

### Desenvolvimento
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENV=development
```

### Produção
```
REACT_APP_API_URL=https://api.seu-dominio.com
REACT_APP_ENV=production
```

## 📱 Responsividade

- ✅ Desktop (1920px+)
- ✅ Laptop (1024px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)

## 🆘 Troubleshooting

### Erro: "cliente_id não fornecido"
- Certifique-se de acessar com: `/?cliente_id=1`
- Verifique se é um número positivo válido

### Erro: "API não conecta"
- Verifique se backend está rodando em `http://localhost:3001`
- Confira `REACT_APP_API_URL` em `.env`
- Verifique CORS no backend

### Arquivo Excel não importa
- Verifique se tem colunas: nome, cpf, valor
- Máximo 5000 linhas
- Formato deve ser .xlsx ou .xls

### Tabela não carrega
- Verifique erro no console (F12)
- Confira se cliente_id existe no banco
- Verifique permissões do usuário

## 📚 Documentação

- [React Docs](https://react.dev)
- [Axios Docs](https://axios-http.com)
- [React Router Docs](https://reactrouter.com)

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
