# Prisme.chatbot: landing page

Landing page da plataforma de atendimento omnichannel **Prisme.chatbot**.

- **Produção:** https://chatbot.prismeapp.com.br (GitHub Pages + domínio via `CNAME`)
- **Stack:** HTML estático gerado por um script (`fonte/build.py`), CSS próprio, JS sem framework.
  Fontes, imagens, áudios e a cena 3D ficam no próprio repositório.
- **Backend de leads:** Cloudflare Worker + Resend (e-mail). Ver [worker/](worker/)

---

## Regra número um: o `index.html` é gerado

Quem manda é a pasta [`fonte/`](fonte/). O `index.html`, o `assets/site.js` e o `assets/imagens.css`
da raiz são **saída do build**: o que for editado direto neles se perde na próxima geração.

```bash
python3 fonte/build.py                 # produção: regrava index.html e assets/
python3 fonte/build.py --unico /tmp/x  # prévia: um index.html só, com tudo embutido, sem rastreamento
npm test                               # 122 checagens da página + 39 do Worker
```

Editou um arquivo de `fonte/` direto pelo GitHub? Não precisa rodar nada: o Action `site`
regera a página e commita o resultado sozinho depois do push na `main`.

---

## Estrutura

```
index.html               # GERADO: a página (marcação + CSS)
assets/site.js           # GERADO: personagem Eve + script da página
assets/imagens.css       # GERADO: fotos dos balões e ilustrações, em um download só
assets/fonts/            # Bricolage Grotesque e DM Sans variáveis (licença OFL)
assets/img/              # logo, selos da Meta, imagem de coexistência, fotos do canal
assets/audio/            # os quatro áudios da Eve (coexistência, na prática, custos, planos)
assets/3d/               # cena 3D do bloco "Foi feito pra mim?" (three.js empacotado + modelos)

fonte/build.py                  # monta tudo
fonte/pagina.src.html           # página principal: topo, bloco 3D, visões por porte, custos, planos
fonte/diferenciais.src.*        # seção "Coisas que só a Prisme tem"
fonte/rodape-agenda.src.*       # rodapé e popup de agendamento
fonte/cabecalho-producao.html   # <head> de produção: SEO, Open Graph, pixel, dados estruturados
fonte/rastreamento.js           # trackEvent e clique em WhatsApp
fonte/eve-character.js          # a Eve (SVG animado)
fonte/dados/                    # fotos, emojis, fontes e imagens de origem
fonte/3d/                       # código da cena 3D (ver fonte/3d/README.md)

test/                    # testes automatizados (jsdom + Worker)
worker/                  # Cloudflare Worker que recebe o lead e envia por e-mail
demo/                    # demonstrações antigas (Flow, Concatenador, Modo Híbrido), independentes
og-image-v2.jpg         # imagem de compartilhamento (WhatsApp, redes), gerada por test/qa/imagem-compartilhamento.mjs
og-image.png, favicon*   # imagem de compartilhamento anterior (mantida para links antigos) e favicons
logo.webp, 1.webp, *.avif na raiz  # imagens da versão anterior, mantidas para não quebrar links externos
robots.txt / sitemap.xml / CNAME
```

---

## Onde mexer em cada coisa

| O quê | Onde |
|---|---|
| Textos de cada porte (dor, exemplos, módulos, custo) | `fonte/pagina.src.html`, objeto `VISOES` |
| Lista "Também disponível" e as cores por família | `fonte/pagina.src.html`, `TODOS` e `FAMILIAS` |
| Planos, preços e balões de cada item | `fonte/pagina.src.html`, seção `#planos` (atributos `data-dica`) |
| Diferenciais (Flows, suporte, relatório, comunidade) | `fonte/diferenciais.src.js` (`FLOWS`, `SUP`, `REL`, `FALAS`) |
| Rodapé e perguntas do agendamento | `fonte/rodape-agenda.src.html` e `.js` (`PERG`, `AGENDAS`) |
| Áudios da Eve (arquivo, transcrição, reações) | `fonte/pagina.src.html`, objeto `AUD` |
| Título, descrição, Open Graph, pixel | `fonte/cabecalho-producao.html` |
| URL do Worker | `fonte/cabecalho-producao.html`, `<meta name="lead-endpoint">` |

### Áudios da Eve

Cada seção com áudio tem uma entrada em `AUD`, com o mp3 e os trechos
`[início, fim, bloco, texto, reação]`. Os tempos vêm das pausas da gravação
(`ffmpeg -af silencedetect`), e `env` é o volume a cada 50 ms, que move as ondas atrás dela.
O áudio só é baixado quando a pessoa toca na Eve e volta ao começo quando a seção sai da tela.

---

## Fluxo de agendamento (qualificação)

Todo botão com `data-agendar` abre o popup (`window.toggleScheduler`), que qualifica o lead
antes de liberar a agenda. Lógica em `fonte/rodape-agenda.src.js`.

1. **É o decisor (dono)?** Se **não**, bloqueia e explica que a call é uma apresentação
   e só ocorre com o decisor (oferece WhatsApp para dúvidas).
2. **Urgência:** o mais rápido possível, em breve ou ainda pensando.
3. **Já tem chatbot?** Sim ou não.
4. **Com quem a call?**
   - **Time de Especialistas:** agenda **gratuita**.
   - **Nattan Lima:** tela de **confirmação de custo** (R$ 197,90, abatido na
     implementação em caso de fechamento, não reembolsável).
5. **Contato** (nome, WhatsApp, e-mail, empresa): envia o lead ao Worker e abre a
   **agenda do Google** correspondente (cada opção tem a sua, embutida por iframe,
   com um link para abrir em outra aba).

As respostas alimentam os eventos de analytics (`agendamento_qualificado`, `lead_enviado` etc.).

---

## Rastreamento de conversão (OpenAI Ads Pixel)

O pixel da **OpenAI Ads** (`oaiq`, ID `Fm75B5NPoYhY18xKckDYmW`) fica no `<head>` e mede
conversões de anúncios no ChatGPT. Mapeamento (função `trackEvent`, em `fonte/rastreamento.js`):

| Momento na página | Evento interno | Evento OpenAI |
|---|---|---|
| Carregamento da página | (nenhum) | `page_viewed` |
| **Cadastro preenchido para agendar a call** (conversão principal) | `cadastro_concluido` | `checkout_started` |
| Agenda do Google exibida após qualificação | `agendamento_qualificado` | `appointment_scheduled` |
| Clique em link de WhatsApp | `contato_whatsapp` | `lead_created` |

- O `checkout_started` gera um `event_id` que segue no payload do lead; o Worker pode
  reenviar o mesmo evento pela **Conversions API** e a OpenAI **deduplica**
  pelo par evento + `event_id`. Ativação opcional: `wrangler secret put OPENAI_ADS_API_KEY`.
- Honeypot preenchido (bot) **não** conta conversão.
- GA4 e Meta Pixel são opcionais: basta carregar o `gtag` ou o `fbq` na página
  que eles passam a receber os mesmos eventos internos.
- A **Tag Klicou** (atribuição de origem, workspace FAZQVENDE) entra no fim da página.
- A prévia (`--unico`) sai **sem** pixel e sem envio de lead, de propósito.

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

- Se a `<meta name="lead-endpoint">` estiver vazia, o site não envia nada e segue direto para a agenda.
- Proteções no Worker: CORS restrito à origem do site, honeypot anti-spam, limite de
  tamanho por campo. Detalhes e deploy em [worker/README.md](worker/README.md).
- O Worker só aceita chamadas de `https://chatbot.prismeapp.com.br` (`ALLOWED_ORIGINS`).
  Para testar o formulário em outro endereço, inclua a origem ali e faça o deploy do Worker.

---

## Deploy

### Site (GitHub Pages)
`commit` + `push` na branch `main`. O GitHub Pages publica em `chatbot.prismeapp.com.br`
em um ou dois minutos. Os arquivos de `assets/` saem com `?v=` do próprio conteúdo,
então ninguém fica com versão antiga em cache.

**Voltar atrás:** reverta o commit (ou o merge) na `main`. A página anterior volta no mesmo prazo.

### Worker (Cloudflare)
Passo a passo em [worker/README.md](worker/README.md). Resumo:
```bash
cd worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put RESEND_API_KEY
```

---

## Testes

```bash
npm install
node test/test.cjs         # página: agendamento, envio do lead, pixel, dependências, conteúdo (122 checagens)
node test/worker.test.mjs  # Worker: CORS, Resend, honeypot, OpenAI CAPI (39 checagens)
```

Os testes não usam rede: o `jsdom` executa o `index.html` e o `assets/site.js` reais,
e o `fetch`/Resend são simulados. A primeira checagem roda o build e confere se os
arquivos gerados estão em dia com `fonte/`.

---

## Notas de manutenção

- **Redesenho de 11/2026:** a página foi refeita na estética nova (tema claro, Bricolage Grotesque
  e DM Sans, a Eve como guia). O Tailwind, os ícones Lucide e a fonte Inter saíram do projeto.
  A versão anterior está no histórico do git.
- **Imagens:** nada de imagem de terceiros. Tudo fica no repositório. As miniaturas dos vídeos do
  canal usam a logo do canal; para usar as capas reais, salve-as em `fonte/dados/img/`.
- **Texto:** a página não usa travessão e não cita a Prisme Lite. Os testes conferem os dois.
- **Animações:** nenhuma cena pode aumentar a página. O palco tem altura travada e o conteúdo rola por dentro.
- **Áreas de toque:** botões e links têm pelo menos 44 px de altura.
- **Domínios:** o site é `*.prismeapp.com.br`; o e-mail sai de `*.prismesales.com.br`
  (domínio verificado no Resend).
- **Pendências de conteúdo e licença** antes de anunciar a página: ver a descrição do PR do redesenho.
