# Prisme.chatbot — Landing Page

Landing page da plataforma de atendimento omnichannel **Prisme.chatbot**.

- **Produção:** https://chatbot.prismeapp.com.br (GitHub Pages + domínio via `CNAME`)
- **Stack:** HTML estático + Tailwind **compilado** (`assets/tailwind.css`) + ícones Lucide gerados (`assets/icons.js`) + fonte Inter hospedada no site + JS vanilla. Logos de marca em SVG inline.
- **Backend de leads:** Cloudflare Worker + Resend (e-mail) — ver [worker/](worker/)

---

## Estrutura

```
index.html            # a landing page inteira (single-file)
assets/tailwind.css   # CSS gerado pelo Tailwind (não editar à mão: npm run build:css)
assets/icons.js       # só os ícones Lucide usados na página (não editar à mão: npm run build:icons)
assets/fonts/         # Inter variável (1 arquivo para todos os pesos, licença OFL)
scripts/build-icons.mjs # gera o assets/icons.js lendo os data-lucide do index.html
tailwind.config.js    # cores da marca, fonte e animações do Tailwind
src/tailwind.css      # entrada do build do Tailwind
.github/workflows/    # build-css: regera CSS e ícones sozinho a cada push na main
1.webp / *.avif        # imagens otimizadas (mockups e selos)
logo.webp              # logo do rodapé
og-image.png           # imagem de compartilhamento (Open Graph 1200x630)
favicon*.{png,ico}     # favicons + apple-touch-icon
robots.txt / sitemap.xml
CNAME                  # domínio do GitHub Pages
DIAGNOSTICO.md         # auditoria técnica (perf/SEO/a11y) + roadmap + refinamento de design (§10)
.impeccable/           # exceções do detector de design (identidade da marca), com justificativas
worker/                # Cloudflare Worker que recebe o lead e envia por e-mail
test/                  # testes automatizados (jsdom + worker)
```

---

## Fluxo de agendamento (qualificação)

Ao clicar em **"Agendar Demonstração"** abre um wizard que qualifica o lead antes de
liberar a agenda. Lógica em `index.html` (funções `qual*`).

1. **É o decisor (dono)?** — se **não**, bloqueia e explica que a call é uma apresentação
   e só ocorre com o decisor (oferece WhatsApp para dúvidas).
2. **Urgência** — mais rápido possível / em breve / ainda pensando.
3. **Já tem chatbot?** — sim / não.
4. **Com quem a call?**
   - **Time de Especialistas** → agenda **gratuita**.
   - **Nattan Lima** → tela de **confirmação de custo** (R$ 197,90, abatido na
     implementação em caso de fechamento, não reembolsável).
5. **Contato** (nome, WhatsApp, e-mail, empresa) → envia o lead ao Worker → abre a
   **agenda do Google** correspondente (cada opção tem sua própria agenda embutida por iframe).

As respostas alimentam eventos de analytics (`agendamento_qualificado`, `lead_enviado`, etc.).

---

## Rastreamento de conversão (OpenAI Ads Pixel)

O pixel da **OpenAI Ads** (`oaiq`, ID `Fm75B5NPoYhY18xKckDYmW`) fica ativo no `<head>` do
`index.html` e mede conversões de anúncios no ChatGPT. Mapeamento (função `trackEvent`):

| Momento na página | Evento interno | Evento OpenAI |
|---|---|---|
| Carregamento da página | — | `page_viewed` |
| **Cadastro preenchido para agendar a call** (conversão principal) | `cadastro_concluido` | `checkout_started` |
| Agenda do Google exibida após qualificação | `agendamento_qualificado` | `appointment_scheduled` |
| Clique em CTA de WhatsApp | `contato_whatsapp` | `lead_created` |

- O `checkout_started` gera um `event_id` que segue no payload do lead; o Worker pode
  reenviar o mesmo evento pela **Conversions API** (server-side) e a OpenAI **deduplica**
  pelo par evento + `event_id`. Ativação opcional: `wrangler secret put OPENAI_ADS_API_KEY`.
- Honeypot preenchido (bot) **não** conta conversão.
- GA4/Meta continuam opcionais (bloco comentado no topo do `<body>`); quando ativados,
  recebem os mesmos eventos internos automaticamente.

---

## Pipeline de leads (seguro para site estático)

O GitHub Pages é estático e público, então **nenhuma chave de API fica no front-end**.
O site só faz um `POST` com os dados do lead; quem fala com o Resend é o Worker.

```
Navegador (chatbot.prismeapp.com.br)
      │  POST JSON (sem segredo)
      ▼
Cloudflare Worker (https://lead.prismesales.com.br)
      │  Authorization: Bearer RESEND_API_KEY  (secret no Cloudflare)
      ▼
Resend  →  call@prismesales.com.br  →  nattan.lima@prismeapp.com.br
```

- A URL do Worker fica em `index.html`:
  `<meta name="lead-endpoint" content="https://lead.prismesales.com.br">`
  (se vazia, o site não envia nada e segue direto para a agenda).
- Proteções no Worker: CORS restrito à origem do site, honeypot anti-spam, limite de
  tamanho por campo. Detalhes e deploy em [worker/README.md](worker/README.md).

---

## Configuração rápida

| O quê | Onde |
|---|---|
| URL do Worker | `index.html` → `<meta name="lead-endpoint">` |
| Destinatário / remetente / CORS | `worker/wrangler.toml` (`TO_EMAIL`, `FROM_EMAIL`, `ALLOWED_ORIGINS`) |
| Chave do Resend (secret) | `wrangler secret put RESEND_API_KEY` (nunca em arquivo versionado) |
| OpenAI Ads Pixel | ativo no `<head>` do `index.html` (`oaiq`); ID também em `worker/wrangler.toml` |
| OpenAI Ads CAPI (opcional) | `wrangler secret put OPENAI_ADS_API_KEY` (reforço server-side c/ dedup) |
| GA4 / Meta Pixel | bloco comentado no topo do `<body>` em `index.html` |

---

## Deploy

### Site (GitHub Pages)
Faça `commit` + `push` na branch `main`. O GitHub Pages publica automaticamente em
`chatbot.prismeapp.com.br`.

**CSS do Tailwind:** a página não usa mais o Tailwind de CDN (ele compilava o CSS no navegador
e deixava a página ~5 s em branco no celular). O CSS é gerado a partir das classes usadas no `index.html`:

```bash
npm install
npm run build       # gera assets/tailwind.css e assets/icons.js
npm test            # 87 checks de fluxo + 39 do Worker
```

Editou o `index.html` direto pelo GitHub e usou uma classe ou um ícone (`data-lucide`) novo? Não precisa
fazer nada: o Action `build-css` regera e commita os arquivos de `assets/` sozinho logo após o push.

### Worker (Cloudflare)
Ver passo a passo em [worker/README.md](worker/README.md). Resumo:
```bash
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put RESEND_API_KEY
```

---

## Testes

```bash
npm install              # instala jsdom (na raiz)
node test/test.cjs       # fluxo/UI (qualificação, envio do lead, pixel OpenAI, dependências) — 87 checks
node test/worker.test.mjs# lógica do Worker (CORS, Resend, honeypot, OpenAI CAPI) — 39 checks
```

Os testes não dependem de rede: o `jsdom` executa o `index.html` real e o `fetch`/Resend
são mockados.

---

## Notas de manutenção

- **Design:** a página passou por um refinamento completo em 26/08/2026 (mobile, contraste WCAG AA,
  modal, tipografia) preservando a identidade indigo/verde — detalhes no [DIAGNOSTICO.md](DIAGNOSTICO.md) §10.
  As exceções deliberadas do detector de design (gradiente da marca, fonte Inter, paleta indigo/roxo) estão
  registradas em `.impeccable/config.json`.

- **Imagens:** otimize antes de subir (a `1.png` original tinha 5 MB; virou `1.webp` com 60 KB).
  Sirva por caminho relativo, não por `raw.githubusercontent.com`.
- **Tailwind:** compilado desde 09/10/2026 (antes era CDN de runtime). Cores e fonte da marca ficam no `tailwind.config.js`.
- **Ícones:** continue usando `<i data-lucide="nome" class="w-5 h-5"></i>` no HTML; o `assets/icons.js` traz só os
  ícones usados (11 KB, antes era a biblioteca inteira do unpkg). Logos de marca (WhatsApp, Instagram, Messenger, TikTok,
  YouTube) são SVG inline com a classe `.fa-svg`; não há mais Font Awesome.
- **Fonte:** Inter variável em `assets/fonts/` (antes Google Fonts com 5 arquivos).
- **Imagens:** nada de imagem de terceiros (avatares, fundos). Tudo fica no próprio repositório.
- **Domínios:** o site é `*.prismeapp.com.br`; o e-mail sai de `*.prismesales.com.br`
  (domínio verificado no Resend).
