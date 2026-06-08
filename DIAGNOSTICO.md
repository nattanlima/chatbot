# Diagnóstico Técnico — Prisme.chatbot (Landing Page)

**Data:** 08/06/2026
**Repositório:** `nattanlima/chatbot`
**Hospedagem:** GitHub Pages → `chatbot.prismeapp.com.br`
**Abordagem definida:** melhorias rápidas *no lugar* (mantendo `index.html` single-file no GitHub Pages)

---

## 1. Resumo executivo

A página tem **bom design e boa copy** — os problemas são quase todos de **engenharia (performance, SEO e mensuração)**, não de conteúdo. Há **3 correções de alto impacto e baixo risco** que sozinhas resolvem a maior parte:

1. **Imagens** — ~11,6 MB de imagens no repo, sendo uma de 6,5 MB sem uso e uma de 5,1 MB num espaço de 300px.
2. **Tailwind via CDN** compilando no navegador (não recomendado para produção).
3. **Sem Open Graph / Analytics** — a página não gera preview ao ser compartilhada e não mede conversão.

**Nota geral estimada:** Performance ~40/100 · SEO ~70/100 · Acessibilidade ~80/100 · Boas práticas ~75/100.
(Estimativa manual; recomendo rodar Lighthouse na URL real para número oficial — ver §8.)

---

## 2. Stack e dependências atuais

| Recurso | Origem | Observação |
|---|---|---|
| Tailwind CSS | `cdn.tailwindcss.com` (play CDN) | ⚠️ Não é para produção — compila no browser |
| Font Awesome 6.4.0 | `cdnjs.cloudflare.com` | CSS completo (~100 KB) p/ poucos ícones |
| Lucide | `unpkg.com/lucide@latest` | ⚠️ Versão não fixada (`@latest`) |
| Inter (fonte) | `fonts.googleapis.com` | 6 pesos (300–800) |
| Imagens | `raw.githubusercontent.com` | ⚠️ Arquivos estão no próprio repo |
| Favicons | `raw.githubusercontent.com/.../meu-crm-pwa` | ⚠️ Dependência de OUTRO repositório |
| Avatares demo | `i.pravatar.cc` (5×) | Aceitável (mockup) |
| Modal agendamento | `calendar.google.com` (iframe) | OK — só carrega ao abrir |

**Métricas medidas:** 1 arquivo HTML (1.240 linhas / 87 KB) · ~588 elementos no DOM · 10 `<img>` · **12 origens externas distintas** (cada uma exige DNS + TLS) · repositório total **~22 MB**.

---

## 3. 🔴 Performance (prioridade máxima)

### 3.1 Imagens — o maior problema
- **`Gemini_Generated_Image_ugsk6yugsk6yugsk.png` = 6,5 MB e NÃO é usada** em nenhum lugar do HTML. Peso morto no repositório → **remover**.
- **`1.png` = 5,1 MB**, exibida dentro de um mockup de celular de ~300px de largura (`index.html:612`). Deveria ter ~50–150 KB. Ação: **redimensionar (~600–800px) + converter para WebP**.
- Nenhuma imagem tem `width`/`height` definidos → causa **layout shift (CLS)**.
- Nenhuma usa `loading="lazy"` nem `decoding="async"`.

> **Impacto:** o primeiro carregamento é dominado por essa única imagem de 5,1 MB. Otimizá-la sozinha já deve cortar o tempo de carregamento drasticamente.

### 3.2 Servir imagens do próprio Pages, não do `raw.`
`index.html:612, 1052, 1057, 1062` apontam para `raw.githubusercontent.com`, mas os arquivos **estão no mesmo repo que o Pages serve**. O `raw.` não é CDN, tem rate-limit e cache fraco. Ação: trocar por **caminhos relativos** (`./1.png`, `./selo-1.avif`, etc.).

### 3.3 Tailwind em runtime
`cdn.tailwindcss.com` baixa um runtime JS e gera o CSS no navegador a cada acesso (causa FOUC e atrasa o render). A própria Tailwind avisa que **não é para produção**.
- **Opção leve (sem build):** gerar o CSS uma vez via Tailwind CLI e commitar um `styles.css` minificado (só as classes usadas, ~10–20 KB) referenciado por `<link>`.

### 3.4 Outras otimizações de rede
- Adicionar `<link rel="preconnect">` / `dns-prefetch` para fonts, cdnjs, unpkg.
- Reduzir os pesos da fonte Inter (6 → 3, ex.: 400/600/800).
- Fixar a versão do Lucide (`lucide@0.x`) em vez de `@latest`.
- Avaliar trocar Font Awesome (CSS inteiro) por SVGs inline dos ~6 ícones de marca usados.

---

## 4. 🟠 SEO e compartilhamento

- ❌ **Sem Open Graph / Twitter Cards** → ao colar o link no WhatsApp, Instagram, LinkedIn **não aparece preview** (título/imagem/descrição). Crítico para uma LP que é compartilhada.
- ❌ Sem `<link rel="canonical">`.
- ❌ Sem **JSON-LD** (`Organization`, `Product`/`Offer`, `FAQPage`) → perde rich results no Google.
- ❌ Sem `robots.txt` e sem `sitemap.xml`.
- ❌ Sem `<meta name="theme-color">`.
- ✅ Tem `lang="pt-BR"`, `<title>` e `meta description` adequados.

---

## 5. 🟡 Bug funcional confirmado

**Troca de abas da calculadora** (`index.html:1192-1193`): no branch da aba "Custos de IA", o código executa `aiTab.classList.add('text-slate-500')` quando deveria ser `apiTab`. Resultado: a aba inativa (API) não recebe o cinza corretamente e a aba ativa fica com classes conflitantes. Correção de 1 linha.

---

## 6. 🟡 Acessibilidade e boas práticas

- `target="_blank"` sem `rel="noopener noreferrer"` no link do YouTube (`index.html:1080`) → risco de reverse tabnabbing.
- Ícones decorativos (`<i data-lucide>` / Font Awesome) sem `aria-hidden="true"`.
- Inputs `range` da calculadora sem `<label for>` associado (têm `<label>` visual, mas sem vínculo programático).
- Botões só-de-ícone na demo: alguns têm `title`, faltam `aria-label` consistentes.
- Sem `rel`/SRI (Subresource Integrity) nos scripts de CDN.
- Favicons dependem de outro repositório → **self-host** os ícones neste repo.

---

## 7. 🟢 Mensuração e conversão (faltando)

- ❌ **Sem Analytics** (GA4) e **sem Meta Pixel**. Hoje não há como medir visitas, origem do tráfego nem **cliques nos botões de WhatsApp** (que são o objetivo da página). Recomendado antes de qualquer campanha paga.
- 💡 Eventos a rastrear: clique em "Contratar Agora" (por plano), "Agendar Demonstração", troca de abas da calculadora.
- 💡 Conteúdo que ajuda conversão **e** SEO: seção de **FAQ** (com `FAQPage` JSON-LD) e **depoimentos/social proof**.

---

## 8. Como obter os números oficiais (Lighthouse)

Recomendo rodar na URL real para baseline antes/depois:

```bash
npx lighthouse https://chatbot.prismeapp.com.br --view
# ou Chrome DevTools → aba "Lighthouse" → Analyze page load
# ou https://pagespeed.web.dev/  (cola a URL)
```

---

## 9. Roadmap sugerido (no lugar, sem mudar a stack)

### Fase 1 — Ganhos rápidos de performance (1ª PR, baixo risco)
- [ ] Remover `Gemini_Generated_Image_*.png` (6,5 MB, sem uso)
- [ ] Otimizar `1.png` → WebP redimensionado
- [ ] Trocar `raw.githubusercontent.com` por caminhos relativos
- [ ] `width`/`height` + `loading="lazy"` nas imagens
- [ ] `preconnect`/`dns-prefetch` + fixar versão do Lucide

### Fase 2 — SEO e compartilhamento
- [ ] Open Graph + Twitter Cards (+ imagem social 1200×630)
- [ ] JSON-LD (Organization, Product/Offer, FAQ)
- [ ] `robots.txt`, `sitemap.xml`, `canonical`, `theme-color`
- [ ] Self-host dos favicons

### Fase 3 — Correções e mensuração
- [ ] Corrigir bug das abas (`switchTab`)
- [ ] `rel="noopener"` + `aria-hidden`/`aria-label`/labels
- [ ] Instalar GA4 + Meta Pixel com eventos de conversão

### Fase 4 — Conteúdo (opcional, alto retorno)
- [ ] Seção de FAQ + depoimentos
- [ ] Tailwind compilado (CSS estático) substituindo o CDN

### (Futuro) — Base para os próximos projetos
- [ ] Extrair um template reutilizável de LP quando partir para novos projetos.

---

> Documento gerado como baseline. Cada fase pode virar uma PR pequena e isolada, mantendo o deploy atual no GitHub Pages.
