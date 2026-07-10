# Design — App "Pedidos em Trânsito Norte" (Duty Cosméticos)

**Data:** 2026-07-09
**Status:** Aprovado para planejamento

---

## 1. Objetivo

App web mobile-first para a equipe comercial do **Norte** da Duty Cosméticos.
Cada RCA (representante) faz login e vê **apenas a carteira dele**; o Head
Comercial (Jean) vê todos os RCAs do Norte. Substitui o relatório diário
"Pedidos em Trânsito" (hoje Excel + dashboard).

## 2. Decisões desta sessão

| Tema | Decisão |
|------|---------|
| Pasta do projeto | `C:\Users\jean.savino\APP PEDIDO  EM TRANSITO` (fora do OneDrive da empresa) |
| Backend/Auth/DB | Supabase — **reaproveitar o projeto existente "BI NORTE"** (`vaooutyuwrrdkmhsgzpt`), reativando-o. Custo R$ 0. Apenas **adicionar** tabelas, sem apagar nada. |
| Hospedagem | **GitHub Pages** (grátis). Código versionado no GitHub. |
| Amostra de dados | Parser construído a partir da spec (cabeçalho na linha 5, aba "Base de pedidos"); validação com arquivo real numa etapa posterior. |
| Deploy Vercel | Descartado (usaremos GitHub Pages). |

## 3. Stack

- **Frontend:** React + Vite + TailwindCSS
- **Roteamento:** `HashRouter` (compatível com GitHub Pages, sem 404 em rotas)
- **Backend/Auth/DB:** Supabase (Auth e-mail/senha)
- **Gráficos:** Recharts
- **Parser Excel:** SheetJS (`xlsx`) no navegador
- **Build:** Vite com `base: '/<nome-do-repo>/'` para GitHub Pages

**Regra de segurança inegociável:** no frontend usar **somente** a chave
publishable/anon do Supabase. A `service_role` **nunca** vai para o navegador
(só seria usada em scripts server-side na eventual Fase 2). Como GitHub Pages é
estático, URL + anon key ficam embutidas no build — isso é esperado e seguro,
pois são chaves públicas protegidas por RLS.

## 4. Modelo de dados

### Tabela `pedidos`
Chave de upsert: `chave`. Coluna de segurança: `vendedor`.

| Coluna Excel | Coluna banco | Tipo |
|---|---|---|
| Chave | chave | text (PK) |
| CNPJ Cliente | cnpj_cliente | text |
| Nome Cliente | nome_cliente | text |
| Vendedor | vendedor | text |
| Cidade | cidade | text |
| Estado | estado | text |
| Região Brasil | regiao_brasil | text |
| Região | regiao | text |
| Filial | filial | text |
| Número Pedido (Protheus) | numero_pedido | text |
| Pedido SalesForce (Oportunidade) | pedido_salesforce | text |
| Ped. Cliente | pedido_cliente | text |
| NF | nf | text |
| Valor Faturado | valor_faturado | numeric |
| Peso | peso | numeric |
| Desc. Tipo Saída | desc_tipo_saida | text |
| Operação | operacao | text |
| Transportador | transportador | text |
| Data Faturamento | data_faturamento | date |
| Data programada expedição | data_prog_expedicao | date |
| Data expedição | data_expedicao | date |
| Lead time (dias úteis) | lead_time | int |
| Previsão de entrega | previsao_entrega | date |
| Data Real de Chegada | data_real_chegada | date |
| Data Real Entrega | data_real_entrega | date |
| Recebimento | recebimento | text |
| Data Agenda | data_agenda | date |
| Status trânsito | status_transito | text |
| OBS. TRÂNSITO | obs_transito | text |

Extras técnicas: `updated_at timestamptz default now()` (para saber a data da
última carga).

**Valores de `status_transito` (exatos):** `Em trânsito`, `Entregue no prazo`,
`Aguarda expedição`, `Entregue em atraso`, `Atrasado`,
`Aguardando descarga no prazo`, `Aguardando descarga`.

### Tabela `rca_acesso`
Mapeia usuário logado → vendedor(es) que pode ver.

| Coluna | Tipo | Observação |
|---|---|---|
| user_id | uuid | referência a auth.users |
| vendedor | text | valor EXATO da coluna Vendedor |
| papel | text | 'rca' ou 'admin' |

Um usuário pode ter várias linhas. Papel 'admin' vê tudo.

## 5. Segurança (RLS) — o coração do app

RLS **ativado** em `pedidos`.

- **SELECT:** usuário autenticado lê uma linha se (a) tem papel 'admin' em
  `rca_acesso`, OU (b) o `vendedor` da linha está entre os vendedores atribuídos
  a ele em `rca_acesso`.
- **INSERT/UPSERT:** somente papel 'admin'. RCAs são somente leitura.
- `rca_acesso`: cada usuário lê apenas as próprias linhas; escrita restrita a admin.

O frontend nunca filtra por vendedor — o banco restringe. O app faz
`select * from pedidos` e o Supabase devolve só o permitido.

## 6. Roster do Norte (whitelist de vendedores)

A carga filtra por estes valores EXATOS da coluna Vendedor (não por estado):

- `FURTADO E GEMAQUE LTDA (FREDERICSON)` → Fredericson
- `NAILSON F COSTA` → Nailson
- `OREN REPRESENTACOES (ROSIMARA)` → Rosimara
- `DANIELA NASCIMENTO DA SILVA` → Daniela
- `FURTADO E GEMAQUE LTDA (ANA GEMAQUE)` → Ana Gemaque
- `ORTIZ E OLIVEIRA REP E COM (SCARLETTY)` → Scarletty
- `ES ANDRADE REPRESENTACOES (EDUARDO)` → Eduardo

## 7. Carga (Fase 1 — MVP): parser + upsert

Módulo isolado de parse/upsert (reaproveitável na Fase 2). Fluxo:

1. Admin faz upload do `.xlsx`.
2. Lê a aba **"Base de pedidos"** com cabeçalho na **linha 5** (pula 4 linhas de título).
3. Mapeia colunas Excel → banco (seção 4).
4. **Filtra** pela whitelist de vendedores (seção 6).
5. Saneia: datas serial do Excel → ISO; numéricos "1.234,56" → number.
6. **Upsert** em `pedidos` por `chave` (atualiza status/datas sem duplicar).
7. Resumo pós-carga: X inseridos, Y atualizados, data de atualização.

## 8. Telas do RCA (mobile-first)

**Dashboard:**
- KPIs: **OTD** = Entregue no prazo / (Entregue no prazo + Entregue em atraso), em %;
  Em trânsito (contagem); Atrasados (Atrasado + Entregue em atraso) — vermelho se > 0;
  Aguardando expedição; Valor total faturado (R$); Peso total (kg).
- Gráfico de status (donut/barras) por `status_transito`.
- **Alertas:** pedidos `Atrasado`, `Aguardando descarga`, ou com `previsao_entrega`
  vencida sem `data_real_entrega`.

**Lista de pedidos:** busca por cliente + filtros por status e estado; colunas
cliente, cidade/UF, NF, valor, status (com cor), previsão. Toque → detalhe.

**Detalhe:** régua de datas (faturamento → prog. expedição → expedição → previsão
→ chegada → entrega); transportadora, operação, lead time, recebimento, OBS;
Protheus, SalesForce, NF, CNPJ.

## 9. Tela do Admin (Jean)

Tudo do RCA vendo todos os RCAs do Norte, mais: filtro por RCA (dropdown),
comparativo simples entre RCAs (OTD por RCA, nº de atrasados por RCA) e a tela
de upload (seção 7).

## 10. Identidade visual

Preto e dourado. Fundo escuro, realces dourados, tipografia limpa. Cores de status:
- Entregue no prazo → verde
- Entregue em atraso / Atrasado → vermelho
- Em trânsito → azul/dourado
- Aguarda expedição / descarga → cinza/âmbar

Mobile-first, single-column, cards grandes e legíveis (uso em campo, no celular).

## 11. Especificidades do GitHub Pages

- `HashRouter` (rotas via `#`, sem 404 no refresh).
- `vite.config.js` com `base: '/<repo>/'`.
- Deploy via GitHub Actions (workflow que builda e publica em `gh-pages`) ou
  `gh-pages` npm. Definir no passo de deploy.
- Segredos: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` embutidos no build
  (públicos por design; segurança real via RLS).

## 12. Fora de escopo agora (Fase 2 — previsto)

Automatizar a carga: script Python já captura o `.xlsx` do Outlook e salva no
OneDrive; na Fase 2 esse script envia os dados do Norte direto ao Supabase (via
REST, com `service_role` no ambiente do Jean — nunca no navegador), eliminando o
upload manual. O módulo de parse/upsert (seção 7) fica isolado para reaproveitar.

## 13. Ordem de construção

1. Reativar "BI NORTE"; criar tabelas `pedidos` e `rca_acesso` + RLS + seed do roster.
2. Scaffold Vite + Tailwind + cliente Supabase; login e-mail/senha.
3. Tela de upload (admin) com parser xlsx + upsert.
4. Dashboard do RCA (KPIs + status + alertas) sob RLS.
5. Lista + detalhe de pedido.
6. Tela admin (todos os RCAs + filtro por RCA + comparativo).
7. Identidade preto/dourado + ajustes mobile.
8. Deploy no GitHub Pages.

## 14. Entrega final (documentação para o Jean)

Ao final, instruções de: (a) como criar os logins dos RCAs no Supabase e
vincular cada um ao seu `vendedor` em `rca_acesso`; (b) como o Jean se atribui
papel 'admin'.
