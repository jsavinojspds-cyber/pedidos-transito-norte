# Guia — Criar logins dos RCAs e definir admin

Cada RCA faz login e vê **apenas a carteira dele**. Quem controla isso é a tabela
`rca_acesso` no Supabase, junto com a segurança (RLS) do banco. O app não decide
nada disso — o banco é quem restringe.

Projeto Supabase: **BI NORTE** (`vaooutyuwrrdkmhsgzpt`).
App: https://jsavinojspds-cyber.github.io/pedidos-transito-norte/

---

## Passo 1 — Criar o usuário (login) no Supabase

1. Acesse o painel do Supabase → projeto **BI NORTE**.
2. Menu **Authentication → Users → Add user**.
3. Preencha **e-mail** e **senha** da pessoa.
4. **Marque "Auto Confirm User"** (assim ela já entra sem precisar confirmar e-mail).
5. Clique em **Create user**.

> Alternativa: me peça ("cria o login do fulano com e-mail X") que eu crio e confirmo pra você.

## Passo 2 — Ligar o usuário ao vendedor dele (carteira)

No painel: **SQL Editor → New query**, cole e rode (troque e-mail e vendedor):

```sql
insert into public.rca_acesso (user_id, vendedor, papel)
values (
  (select id from auth.users where email = 'email-da-pessoa@exemplo.com'),
  'NAILSON F COSTA',   -- string EXATA do vendedor (ver tabela abaixo)
  'rca'
);
```

Pronto: essa pessoa passa a ver só os pedidos desse vendedor.

- **Mais de uma carteira?** Rode o insert uma vez para cada vendedor (mesma pessoa,
  vendedores diferentes).
- **Tornar alguém admin (vê tudo, como você):** use `'admin'` no lugar de `'rca'`
  (o `vendedor` pode ser qualquer texto, ex.: `'ADMIN'`).

## Roster do Norte (nome → string EXATA do vendedor)

Use exatamente estes valores na coluna `vendedor`:

| Pessoa | Valor EXATO (coluna `vendedor`) |
|---|---|
| Fredericson | `FURTADO E GEMAQUE LTDA (FREDERICSON)` |
| Nailson | `NAILSON F COSTA` |
| Rosimara | `OREN REPRESENTACOES (ROSIMARA)` |
| Daniela | `DANIELA NASCIMENTO DA SILVA` |
| Ana Gemaque | `FURTADO E GEMAQUE LTDA (ANA GEMAQUE)` |
| Scarletty | `ORTIZ E OLIVEIRA REP E COM (SCARLETTY)` |
| Eduardo | `ES ANDRADE REPRESENTACOES (EDUARDO)` |

## Conferir / remover acessos

Ver todos os acessos:
```sql
select u.email, a.vendedor, a.papel
from public.rca_acesso a
join auth.users u on u.id = a.user_id
order by u.email;
```

Remover um acesso:
```sql
delete from public.rca_acesso
where user_id = (select id from auth.users where email = 'email@exemplo.com')
  and vendedor = 'NAILSON F COSTA';
```

## Seu login de admin (já configurado)

- E-mail: `jsavino.jspds@gmail.com` — papel **admin** (vê todos os RCAs).
- **Troque a senha** assim que puder: painel → Authentication → Users → seu usuário →
  **Reset password** / definir nova senha. (Ou me peça que eu troco.)

## Observações de segurança

- A chave que vai no app (publishable) é **pública por design**; o que protege os
  dados é o login + o RLS. Um RCA nunca consegue ver a carteira de outro, mesmo
  mexendo no navegador.
- Só o **admin** consegue fazer a carga (upload do Excel). RCAs são somente leitura.
