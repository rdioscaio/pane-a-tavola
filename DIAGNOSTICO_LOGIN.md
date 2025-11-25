# Diagnóstico: Problema de Login em paneatavola.com.br/admin

## Resumo Executivo

O painel administrativo em `paneatavola.com.br/admin` **não está funcionando** porque a página de admin não foi implementada no `index.html`. Quando você acessa `/admin`, o servidor Cloudflare Pages está servindo a mesma página inicial (index.html) em vez de uma página de login dedicada.

## Problemas Identificados

### 1. **Falta de Página de Admin Dedicada**
- ❌ Não existe uma página HTML separada para `/admin`
- ❌ O `index.html` não contém formulário de login
- ❌ Não há elementos com `id="admin"`, `class="admin"`, `id="login"` ou `class="login"`
- ❌ Quando você acessa `/admin`, o servidor retorna a mesma página inicial (index.html)

### 2. **Estrutura de Rotas Incompleta**
O arquivo `wrangler.toml` está configurado para servir arquivos estáticos, mas não há:
- Arquivo `_routes.json` para definir rotas dinâmicas
- Arquivo `functions/api/admin/login.js` (o arquivo `login.js` está na raiz, não na estrutura correta)
- Arquivo `functions/api/admin/orders.js` (o arquivo `orders.js` está na raiz)
- Arquivo `functions/api/admin/sales.js` (o arquivo `sales.js` está na raiz)

### 3. **Estrutura de Diretórios Incorreta para Cloudflare Pages**
Cloudflare Pages Functions espera a seguinte estrutura:
```
projeto/
├── public/                    (arquivos estáticos)
│   └── index.html
├── functions/                 (serverless functions)
│   └── api/
│       ├── checkout.js
│       ├── track.js
│       └── admin/
│           ├── login.js
│           ├── orders.js
│           ├── sales.js
│           └── export-orders.js
└── wrangler.toml
```

**Estrutura atual (incorreta):**
```
projeto/
├── index.html
├── login.js                   ❌ Deveria estar em functions/api/admin/login.js
├── orders.js                  ❌ Deveria estar em functions/api/admin/orders.js
├── sales.js                   ❌ Deveria estar em functions/api/admin/sales.js
├── export-orders.js           ❌ Deveria estar em functions/api/admin/export-orders.js
├── checkout.js                ❌ Deveria estar em functions/api/checkout.js
├── track.js                   ❌ Deveria estar em functions/api/track.js
└── wrangler.toml
```

### 4. **Arquivo `wrangler.toml` Incompleto**
```toml
name = "paneatavola"
compatibility_date = "2025-11-21"
pages_build_output_dir = "."
```

Faltam:
- ❌ Definição de `build.command` (como compilar/preparar o projeto)
- ❌ Definição de `build.cwd` (diretório de trabalho da build)
- ❌ Variáveis de ambiente (`ADMIN_PASSWORD`, `ADMIN_SESSION_TOKEN`)
- ❌ Configuração de D1 database (está presente, mas não vinculada corretamente)

### 5. **Falta de Página de Login HTML**
Não existe um arquivo HTML para o painel de admin com:
- ❌ Formulário de login
- ❌ Validação de senha
- ❌ Interface de gerenciamento de pedidos
- ❌ Interface de visualização de vendas
- ❌ Função de exportar pedidos em CSV

## Análise Técnica

### O que Acontece Quando Você Acessa `/admin`

1. Você acessa `https://paneatavola.com.br/admin`
2. Cloudflare Pages tenta encontrar um arquivo em `functions/api/admin.js` ou uma página estática
3. Como não existe, ele retorna o `index.html` padrão (fallback)
4. Você vê a página inicial da loja, não o painel de admin
5. Não há erro visível, mas o login não funciona

### Erros no Console do Navegador

- ✅ Nenhum erro JavaScript (porque é a página inicial normal)
- ✅ Nenhum erro de rede (porque o servidor retorna 200 OK com index.html)
- ❌ Mas a página de admin não existe

## Solução Recomendada

### Passo 1: Reorganizar a Estrutura de Diretórios
```bash
# Criar estrutura correta
mkdir -p functions/api/admin
mkdir -p public

# Mover arquivos estáticos para public/
mv index.html public/
mv *.jpg public/
mv *.png public/
mv *.webp public/
mv *.svg public/

# Mover functions para o lugar correto
mv checkout.js functions/api/
mv track.js functions/api/
mv login.js functions/api/admin/
mv orders.js functions/api/admin/
mv sales.js functions/api/admin/
mv export-orders.js functions/api/admin/
```

### Passo 2: Atualizar `wrangler.toml`
```toml
name = "paneatavola"
compatibility_date = "2025-11-21"
pages_build_output_dir = "public"

[[d1_databases]]
binding = "PANE_DB"
database_name = "paneatavola-crm"
database_id = "f7fdcc32-707d-417d-9ddf-de0b200474d0"

[env.production]
vars = { ADMIN_PASSWORD = "sua-senha-aqui", ADMIN_SESSION_TOKEN = "seu-token-aqui" }
```

### Passo 3: Criar Página de Admin (`public/admin.html`)
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Painel Administrativo - Pane a Tavola</title>
  <style>
    body {
      font-family: "Work Sans", system-ui, -apple-system, sans-serif;
      background: #fdf7ee;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
    }
    .login-container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 400px;
    }
    h1 { text-align: center; color: #4b2e1e; }
    input { width: 100%; padding: 0.75rem; margin: 1rem 0; border: 1px solid #e4d3b5; border-radius: 6px; }
    button { width: 100%; padding: 0.75rem; background: #8a5a35; color: white; border: none; border-radius: 6px; cursor: pointer; }
    button:hover { background: #6b4428; }
    .error { color: red; text-align: center; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Painel Administrativo</h1>
    <form id="login-form">
      <input type="password" id="password" placeholder="Senha do painel" required>
      <button type="submit">Entrar</button>
    </form>
    <div id="error" class="error"></div>
  </div>

  <script>
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value;
      
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        
        const data = await res.json();
        
        if (data.ok) {
          window.location.href = '/admin/dashboard';
        } else {
          document.getElementById('error').textContent = data.error;
        }
      } catch (err) {
        document.getElementById('error').textContent = 'Erro ao conectar';
      }
    });
  </script>
</body>
</html>
```

### Passo 4: Criar Rota de Redirecionamento (`functions/admin.js`)
```javascript
export async function onRequest(context) {
  // Redireciona /admin para /admin.html
  return new Response(null, {
    status: 302,
    headers: { Location: '/admin.html' }
  });
}
```

### Passo 5: Configurar Variáveis de Ambiente
No painel do Cloudflare Pages:
1. Vá em **Settings** → **Environment variables**
2. Adicione:
   - `ADMIN_PASSWORD` = sua senha segura
   - `ADMIN_SESSION_TOKEN` = um token aleatório (ex: `abc123xyz789`)

## Resumo das Causas Raiz

| Problema | Causa | Impacto |
|----------|-------|--------|
| Página `/admin` não existe | Falta arquivo `admin.html` ou rota em `functions/` | Retorna index.html (página inicial) |
| Functions não são encontradas | Arquivos `.js` estão na raiz, não em `functions/` | Rotas de API não funcionam |
| Variáveis de ambiente não definidas | Não configuradas no Cloudflare Pages | Login não consegue validar senha |
| Estrutura de diretórios incorreta | `wrangler.toml` aponta para `.` em vez de `public/` | Build não funciona corretamente |

## Próximos Passos

1. ✅ Reorganizar estrutura de diretórios
2. ✅ Criar página de admin (`admin.html`)
3. ✅ Atualizar `wrangler.toml`
4. ✅ Configurar variáveis de ambiente no Cloudflare Pages
5. ✅ Fazer deploy: `wrangler pages deploy`
6. ✅ Testar login em `paneatavola.com.br/admin`

---

**Data do Diagnóstico:** 25 de novembro de 2025  
**Repositório:** https://github.com/rdioscaio/pane-a-tavola
