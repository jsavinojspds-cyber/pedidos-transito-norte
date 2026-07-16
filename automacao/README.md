# Automação da carga (Fase 2)

Script Python que lê a planilha diária "Em trânsito", filtra os 7 vendedores do
Norte e envia os dados direto para o Supabase — **sem upload manual**. Também
registra o **nome do arquivo**, que aparece no aviso do Dashboard.

O script roda **na máquina do Jean**, então ele lê normalmente a planilha que já
é salva no OneDrive.

## 1. Configurar (uma vez)

Edite `automacao/config.env` e preencha o caminho da planilha:

```
ARQUIVO_XLSX=C:\Users\jean.savino\OneDrive - Duty Cosméticos\...\Em trânsito.xlsx
```

Ou, se o nome muda todo dia, use a pasta + padrão (pega o **mais recente**):

```
# ARQUIVO_XLSX=
PASTA_XLSX=C:\Users\jean.savino\OneDrive - Duty Cosméticos\...\pasta
PADRAO=*transito*.xlsx
```

> `config.env` **não vai para o Git** (tem senha). O modelo é `config.exemplo.env`.

## 2. Testar sem gravar

```powershell
cd "C:\Users\jean.savino\APP PEDIDO  EM TRANSITO"
automacao\.venv\Scripts\python.exe automacao\carga_transito.py --dry-run
```

Mostra quantos pedidos leu e quantos por vendedor, **sem tocar no banco**.

## 3. Rodar a carga de verdade

```powershell
automacao\.venv\Scripts\python.exe automacao\carga_transito.py
```

Saída: `Inseridos: X | Atualizados: Y | Total: Z` e o nome do arquivo registrado.
A gravação é **upsert por `chave`** — rodar duas vezes não duplica nada.

Para um arquivo específico:
```powershell
automacao\.venv\Scripts\python.exe automacao\carga_transito.py --arquivo "C:\caminho\arquivo.xlsx"
```

## 4. Agendar (rodar sozinho todo dia)

Cria uma tarefa que roda todo dia às 08:00:

```powershell
schtasks /create /tn "Carga Pedidos Transito Norte" ^
  /tr "\"C:\Users\jean.savino\APP PEDIDO  EM TRANSITO\automacao\.venv\Scripts\python.exe\" \"C:\Users\jean.savino\APP PEDIDO  EM TRANSITO\automacao\carga_transito.py\"" ^
  /sc daily /st 08:00
```

Conferir / remover:
```powershell
schtasks /query /tn "Carga Pedidos Transito Norte"
schtasks /delete /tn "Carga Pedidos Transito Norte" /f
```

> Agende **depois** do horário em que o seu script do Outlook salva a planilha.

## Ambiente

O ambiente Python já está criado em `automacao/.venv` com o `openpyxl`.
Se precisar recriar:

```powershell
python -m venv automacao\.venv
automacao\.venv\Scripts\python.exe -m pip install -r automacao\requirements.txt
```

## Como funciona (resumo)

1. Acha o arquivo (caminho fixo ou o mais recente da pasta)
2. Lê a aba **"Base de pedidos"**, cabeçalho na **linha 5**
3. Mapeia as 29 colunas, converte datas (serial/`dd/mm/aaaa`) e números (`1.234,56`)
4. Filtra os **7 vendedores do Norte** (ignora o resto)
5. Entra como admin e faz **upsert por `chave`** em lotes de 500
6. Registra em `carga_info` o nome do arquivo → aparece no Dashboard

Mesma lógica do leitor do app (`src/lib/pedidosParser.js`), em Python.
