# Deploy no GitHub Pages

O app é publicado no branch **`gh-pages`** (arquivos estáticos já buildados).
Pages serve a partir desse branch, na raiz `/`.

URL: `https://jsavinojspds-cyber.github.io/pedidos-transito-norte/`

## Publicar uma nova versão (manual)

Com o Node no PATH (`C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64`), na pasta do app:

```powershell
$env:Path = "C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64;$env:Path"
npm run build
New-Item -ItemType File dist/.nojekyll -Force   # evita processamento Jekyll
# publica a pasta dist no branch gh-pages
Set-Location dist
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.name="Jean Savino" -c user.email="jsavino.jspds@gmail.com" commit -q -m "deploy"
git remote add origin https://github.com/jsavinojspds-cyber/pedidos-transito-norte.git
git push -f origin gh-pages
Set-Location ..
Remove-Item dist/.git -Recurse -Force
```

As chaves do Supabase (URL + publishable key) entram no build via `.env.local`
(local) — são públicas por design; a segurança real é o RLS.

## Opcional: CI automático (quando o token do gh tiver o escopo `workflow`)

Hoje o token do `gh` não tem escopo `workflow`, então não dá para enviar arquivos
em `.github/workflows/` por push. Para automatizar depois:

1. `gh auth refresh -h github.com -s workflow` (login interativo), OU criar o arquivo
   pela interface web do GitHub.
2. Criar `.github/workflows/deploy.yml` com:

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          VITE_SUPABASE_URL: https://vaooutyuwrrdkmhsgzpt.supabase.co
          VITE_SUPABASE_ANON_KEY: sb_publishable_77ONApZYYs6DHLjMngdpsg_0XwR0xUc
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

3. Em Settings → Pages, definir a origem como "GitHub Actions".
