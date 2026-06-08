# Worker de envio de leads (Resend)

Recebe o `POST` do formulário de agendamento e envia um e-mail para o Nattan via **Resend**.
A chave do Resend fica como **secret no Cloudflare** — nunca no site/GitHub Pages.

```
Navegador (chatbot.prismeapp.com.br)
        │  POST JSON (sem segredo)
        ▼
Cloudflare Worker  ──Authorization: Bearer RESEND_API_KEY──▶  Resend  ──▶  nattan.lima@prismeapp.com.br
```

## Pré-requisitos

1. Conta na **Cloudflare** (gratuita).
2. Conta no **Resend** com o domínio **prismeapp.com.br verificado** (DNS) — necessário para enviar como `@prismeapp.com.br`.
3. Uma **API key** do Resend.

## Deploy (uma vez)

```bash
npm install -g wrangler
wrangler login

cd worker
wrangler secret put RESEND_API_KEY      # cole a chave do Resend quando pedir
wrangler deploy
```

O deploy imprime a URL pública, algo como:
`https://prisme-lead.SEU-SUBDOMINIO.workers.dev`

## Conectar no site

No `index.html`, preencha a meta tag com a URL do Worker:

```html
<meta name="lead-endpoint" content="https://prisme-lead.SEU-SUBDOMINIO.workers.dev">
```

Pronto. Enquanto a meta estiver vazia, o site **não envia** nada e segue direto para a agenda
(útil para publicar o site antes do Worker estar no ar).

## Configurações (wrangler.toml)

| Variável | Função |
|---|---|
| `TO_EMAIL` | Destinatário do lead (Nattan) |
| `FROM_EMAIL` | Remetente verificado no Resend |
| `ALLOWED_ORIGINS` | Origens liberadas no CORS (separadas por vírgula) |
| `RESEND_API_KEY` | **Secret** (via `wrangler secret put`, não fica no arquivo) |

## Testar localmente

```bash
cd worker
wrangler dev
# em outro terminal:
curl -X POST http://localhost:8787 -H "Content-Type: application/json" \
  -d '{"nome":"Teste","whatsapp":"24999999999","email":"teste@ex.com","empresa":"ACME","decisor":"sim","urgencia":"rapido","chatbot":"nao","agenda":"especialistas"}'
```

Teste unitário da lógica (sem deploy, com `fetch` mockado):

```bash
node test/worker.test.mjs      # a partir da raiz do projeto
```

## Segurança

- A chave do Resend **só existe no Worker** (secret). O front envia apenas dados do lead.
- **CORS** restringe quem pode chamar o Worker (`ALLOWED_ORIGINS`).
- **Honeypot** (`website`) descarta spam de bots silenciosamente.
- Limite de tamanho por campo evita payloads abusivos.
- Para WhatsApp automático ao Nattan, dá para adicionar um segundo passo aqui
  (chamar a WhatsApp Cloud API / n8n) reaproveitando o mesmo Worker.
