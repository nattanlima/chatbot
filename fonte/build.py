"""Monta a página do chatbot.prismeapp.com.br a partir dos arquivos desta pasta.

    python3 fonte/build.py            # produção: grava index.html e assets/ na raiz do repositório
    python3 fonte/build.py --unico DIR  # prévia: um index.html só, com tudo embutido, em DIR

O index.html da raiz é GERADO. Edite os arquivos .src.* desta pasta e rode o build de novo.
"""
import base64, glob, hashlib, json, os, re, shutil, subprocess, sys
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)
D = AQUI + '/dados'
UNICO = sys.argv[sys.argv.index('--unico') + 1] if '--unico' in sys.argv else None
b64 = lambda p: base64.b64encode(open(p, 'rb').read()).decode()
icons = json.load(open(D + '/icons.json'))
svg = lambda i: '<svg viewBox="%s"><path d="%s"/></svg>' % (icons[i]['vb'], icons[i]['d'])
ICON = {
    'wa': svg(0), 'ig': svg(1), 'fb': svg(3), 'tt': svg(4),
    # Mercado Livre e RCS: glifos neutros (sacola e balao), nao as marcas oficiais
    'ml': '<svg viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    'rcs': '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01"/></svg>',
}
CHECK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.500"/></svg>'
# Fotos: dados/pessoas/p1.webp, p2.webp... Quantas houver. Cada pessoa usa UMA foto; quem ficar sem foto ganha iniciais.
ARQS = sorted(glob.glob(D + '/pessoas/p*.webp'), key=lambda f: int(''.join(ch for ch in os.path.basename(f) if ch.isdigit())))
NFOTOS = len(ARQS)
INICIAIS = ['AL','BR','CS','DM','EF','GT','HN','IV','JP','KA','LM','MO','NR','PS','RC','SB','TV','VA','WL','YM','ZF','AC','BG','CL','DR','EM','FS','GL','HM','IR','JS','LT','MA','NP']
def av(face, canal):
    chip = '<span class="hx-chip" data-c="%s">%s</span>' % (canal, ICON[canal])
    if face <= NFOTOS:
        return '<span class="hx-av hx-f%d">%s</span>' % (face, chip)
    n = face - NFOTOS - 1
    return '<span class="hx-av hx-ini" data-t="%d">%s%s</span>' % (n % 7, INICIAIS[n % len(INICIAIS)], chip)

# (tipo, profundidade, foto, canal, texto, x, y desktop, x, y celular ou None)  -> % do hero
SRC = {
 'ads':  '<svg viewBox="0 0 24 24"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6l-5 4H4a1 1 0 0 0-1 1zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/></svg>',
 'busca':'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.300-4.300"/></svg>',
 'form': '<svg viewBox="0 0 24 24"><path d="M9 3h6v3H9zM7 5H5v16h14V5h-2M9 11h6M9 15h6"/></svg>',
 'site': '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
 'qr':   '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM18 14h2M14 18v2"/></svg>',
 'link': '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1"/></svg>',
}
# (tipo, profundidade, foto ou None, canal/fonte, texto, x, y desktop [% da caixa titulo->botoes], x, y celular [% do palco] ou None)
B = [
 ('full', 3, 1, 'wa',  'Tem no tamanho M?',      9, 28,   26, 4),
 ('full', 2, 2, 'ig',  'Aceita Pix?',           91, 26,   74, 17),
 ('full', 2, 3, 'fb',  'Cadê meu pedido?',      24, 57,   26, 69),
 ('full', 3, 4, 'tt',  'Entrega hoje?',         77, 55,   77, 70),
 ('full', 2, 5, 'ml',  'Tem desconto?',         15, 74,   27, 82),
 ('full', 3, 6, 'rcs', 'Quero remarcar',        85, 75,   72, 94),
 ('full', 2, 3, 'wa',  'Vocês abrem sábado?',   30, 93,   None, None),
 ('full', 2, 4, 'ig',  'Qual o valor do frete?',70, 94,   None, None),
 ('lead', 2, None, 'ads',  'Lead do anúncio',     9, 2,    72, 4),
 ('lead', 2, None, 'busca','Veio do Google',     91, 1,    24, 94),
 ('lead', 2, None, 'form', 'Formulário do site', 21, 41,   28, 30),
 ('lead', 3, None, 'site', 'Chat do site',       79, 40,   None, None),
 ('lead', 1, None, 'ads',  'Clicou no anúncio',  33, 69,   None, None),
 ('lead', 2, None, 'qr',   'QR code da loja',    67, 70,   None, None),
 ('lead', 1, None, 'link', 'Link da bio',        11, 91,   None, None),
 ('lead', 2, None, 'form', 'Pediu orçamento',    89, 92,   None, None),
 ('mini', 1, 5, 'wa',  '',  4, 13,   40, 17),
 ('mini', 2, 2, 'tt',  '', 15, 22,   12, 17),
 ('mini', 1, 6, 'fb',  '', 96, 13,   92, 31),
 ('mini', 2, 1, 'ig',  '', 80, 19,   94, 52),
 ('mini', 2, 3, 'ml',  '',  7, 44,    6, 48),
 ('mini', 1, 4, 'wa',  '', 32, 33,   91, 82),
 ('mini', 1, 6, 'ig',  '', 94, 43,   62, 29),
 ('mini', 1, 2, 'wa',  '', 68, 33,    None, None),
 ('mini', 3, 1, 'rcs', '', 37, 52,   None, None),
 ('mini', 1, 5, 'fb',  '', 12, 59,   None, None),
 ('mini', 3, 3, 'tt',  '',  4, 63,   None, None),
 ('mini', 2, 6, 'wa',  '', 63, 51,   None, None),
 ('mini', 2, 2, 'ml',  '', 89, 60,   None, None),
 ('mini', 1, 1, 'fb',  '', 96, 65,   None, None),
 ('mini', 2, 4, 'rcs', '',  6, 80,   None, None),
 ('mini', 1, 5, 'ig',  '', 24, 82,   None, None),
 ('mini', 3, 6, 'tt',  '', 38, 81,   None, None),
 ('mini', 1, 1, 'wa',  '', 74, 83,   None, None),
 ('mini', 3, 2, 'fb',  '', 95, 81,   None, None),
 ('mini', 2, 3, 'ig',  '', 62, 83,   None, None),
 ('mini', 1, 4, 'wa',  '',  3, 96,   None, None),
 ('mini', 2, 5, 'tt',  '', 97, 97,   None, None),
 ('mini', 1, 6, 'ml',  '', 44, 47,   None, None),
 ('mini', 2, 1, 'wa',  '', 56, 45,   None, None),
 ('mini', 1, 3, 'rcs', '',  3, 36,   None, None),
]
# ordem de chegada embaralhada (deterministica) para os balões pipocarem pela tela toda
ordem = sorted(range(len(B)), key=lambda i: (i * 11 + 3) % len(B))
pos = {i: n for n, i in enumerate(ordem)}
bal = []
pessoa = 0
for i, (tipo, d, face, canal, txt, x, y, xm, ym) in enumerate(B):
    if tipo != 'lead':
        pessoa += 1; face = pessoa   # numeração sequencial: ninguém se repete
    dk = xm is None
    st = '--o:%d;--d:%d;--x:%s;--y:%s' % (pos[i], d, x, y)
    if not dk:
        st += ';--xm:%s;--ym:%s' % (xm, ym)
    lado = 'e' if x < 50 else 'd'
    inner = ('<span class="hx-src">%s</span>' % SRC[canal] if tipo == 'lead' else av(face, canal)) + txt
    bal.append('    <div class="hx-bal hx-%s%s" data-d="%d" data-lado="%s" style="%s"><div class="hx-par"><div class="hx-bub">%s</div></div></div>'
               % ('full hx-lead' if tipo == 'lead' else tipo, ' hx-dk' if dk else '', d, lado, st, inner))

R = [
 (1, 'wa',  'Mariana', 'WhatsApp',      'Tem no tamanho M?', 'Temos M e G. Separo pra você?', 'vendas', 'Vendas'),
 (2, 'ig',  'Lucas',   'Instagram',     'Aceita Pix?',       'Aceitamos! Já te mando a chave.', 'financeiro', 'Financeiro'),
 (3, 'fb',  'Carla',   'Messenger',     'Cadê meu pedido?',  'Saiu pra entrega, chega hoje.', 'suporte', 'Suporte'),
 (4, 'tt',  'Rafa',    'TikTok',        'Entrega hoje?',     'Pedidos até 16h saem hoje.', 'vendas', 'Vendas'),
 (5, 'ml',  'Bia',     'Mercado Livre', 'Tem desconto?',     '5% no Pix à vista.', 'vendas', 'Vendas'),
 (6, 'rcs', 'João',    'RCS',           'Quero remarcar',    'Remarcado pra quinta, 14h.', 'agenda', 'Agenda'),
]
rows = ['          <div class="hx-row">%s<div class="hx-rt"><div class="hx-rn">%s <i>no %s</i></div><div class="hx-msg"><span class="hx-q">%s</span><span class="hx-dots"><i></i><i></i><i></i></span><span class="hx-a">%s</span></div></div><span class="hx-tag" data-s="%s">%s%s</span></div>'
        % (av(f, c), nome, canal, q, a, s, CHECK, tag) for f, c, nome, canal, q, a, s, tag in R]


IC_FB = '<svg viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>'

def uri(mime, arq):
    return 'data:%s;base64,%s' % (mime, b64(arq))
ler = lambda nome: open(AQUI + '/' + nome, encoding='utf-8').read()
faces = '\n'.join('.hx-f%d{background-image:url("%s")}' % (i + 1, uri('image/webp', f)) for i, f in enumerate(ARQS))
emojis = ''.join('.em-%s{background-image:url("%s")}' % (os.path.basename(f)[:-5], uri('image/webp', f)) for f in sorted(glob.glob(D + '/emoji/*.webp')))

# imagens: (marcador, arquivo em dados/, tipo). Na prévia viram data URI; na produção viram arquivos em assets/img/.
IMGS = [('{{LOGO}}', 'logo-simbolo.svg', 'image/svg+xml'), ('{{SELO_META}}', 'img/selo-provedor-meta.avif', 'image/avif'),
        ('{{SELO_PARTNER}}', 'img/meta-business-partner.avif', 'image/avif'), ('{{SELO_WA}}', 'img/whatsapp-business-api.avif', 'image/avif'),
        ('{{CANAL_LOGO}}', 'img/canal-logo.webp', 'image/webp'), ('{{CANAL_FOTO}}', 'img/canal-foto.webp', 'image/webp'),
        ('{{COEX}}', 'img/coexistencia.webp', 'image/webp')]
FONTES = [('{{FONT_DISPLAY}}', 'bricolage-grotesque-latin-wdth-normal.woff2'), ('{{FONT_BODY}}', 'dm-sans-latin-wght-normal.woff2')]

rep = {
    '{{IC_YT}}': svg(5), '{{IC_WA}}': ICON['wa'], '{{IC_IG}}': ICON['ig'], '{{IC_FB}}': IC_FB,
    '{{BALOES}}': '\n'.join(bal), '{{ROWS}}': '\n'.join(rows),
}

h = ler('pagina.src.html')
# as seções maiores ficam em arquivos próprios e entram aqui antes dos demais marcadores
for marca, arq in (('{{SP_HTML}}', 'diferenciais.src.html'), ('{{SP_CSS}}', 'diferenciais.src.css'), ('{{SP_JS}}', 'diferenciais.src.js'),
                   ('{{FIM_HTML}}', 'rodape-agenda.src.html'), ('{{FIM_CSS}}', 'rodape-agenda.src.css'), ('{{FIM_JS}}', 'rodape-agenda.src.js')):
    assert h.count(marca) == 1, marca
    h = h.replace(marca, ler(arq))
for k, v in rep.items():
    h = h.replace(k, v)

# o script da página fica entre estes dois marcos no pagina.src.html
INI, FIM = '<script>\n{{EVE_JS}}\n</script>\n<script>\n', '</script>\n</body>'
assert h.count(INI) == 1 and h.count(FIM) == 1, 'marcos do script'
a, b = h.index(INI), h.index(FIM)
js_pagina, eve = h[a + len(INI):b], ler('eve-character.js')
h = h[:a] + '{{SCRIPTS}}' + h[b + len('</script>\n'):]

def fecha(texto):
    assert '{{' not in texto, 'marcador sobrando: ' + texto[texto.index('{{'):][:40]
    assert chr(0x2014) not in texto, 'travessão no texto'
    return texto

if UNICO:
    # prévia: um arquivo só, sem SEO nem rastreamento, com 3D e áudios na mesma pasta
    sub = {m: uri(t, D + '/' + arq) for m, arq, t in IMGS}
    sub.update({m: uri('font/woff2', D + '/fontes/' + arq) for m, arq in FONTES})
    sub.update({'{{FACES_CSS}}': faces, '{{EMOJI_CSS}}': emojis, '{{DIR_3D}}': '', '{{DIR_AUDIO}}': '', '{{V}}': '', '{{CSS_IMAGENS}}': '',
                '{{HEAD}}': '<title>Prisme Chatbot · prévia</title>\n<meta name="robots" content="noindex">\n<meta name="theme-color" content="#eaf3ff">'})
    js = eve.replace('</script', '<\\/script') + '\n</script>\n<script>\n' + js_pagina
    for k, v in sub.items():
        h, js = h.replace(k, v), js.replace(k, v)
    h = fecha(h.replace('{{SCRIPTS}}', '<script>\n' + js + '</script>\n'))
    os.makedirs(UNICO, exist_ok=True)
    open(UNICO + '/index.html', 'w', encoding='utf-8').write(h)
    print('prévia:', UNICO + '/index.html', len(h) // 1024, 'KB')
else:
    # produção: HTML enxuto + arquivos em assets/ (com ?v= do conteúdo, para o cache nunca servir versão velha)
    A = RAIZ + '/assets'
    for d in ('img', 'fonts'):
        os.makedirs(A + '/' + d, exist_ok=True)
    marca = lambda dados: hashlib.sha1(dados).hexdigest()[:8]
    sub = {}
    for m, arq, _ in IMGS:
        nome = os.path.basename(arq)
        shutil.copyfile(D + '/' + arq, A + '/img/' + nome)
        sub[m] = 'assets/img/' + nome
    for m, arq in FONTES:
        shutil.copyfile(D + '/fontes/' + arq, A + '/fonts/' + arq)
        sub[m] = 'assets/fonts/' + arq
    for lic in glob.glob(D + '/fontes/LICENSE-*.txt'):
        shutil.copyfile(lic, A + '/fonts/' + os.path.basename(lic))
    v3d = marca(open(A + '/3d/cena-porte.js', 'rb').read())
    sub.update({'{{FACES_CSS}}': '', '{{EMOJI_CSS}}': '', '{{DIR_3D}}': 'assets/3d/', '{{DIR_AUDIO}}': 'assets/audio/', '{{V}}': '?v=' + v3d})
    css_img = fecha('/* GERADO por fonte/build.py: fotos dos balões e ilustrações dos produtos, embutidas para virar um único download. */\n' + faces + '\n' + emojis + '\n')
    js = eve + '\n' + js_pagina
    for k, v in sub.items():
        h, js = h.replace(k, v), js.replace(k, v)
    js = fecha('/* GERADO por fonte/build.py. Edite os arquivos em fonte/ e rode o build. */\n' + js)
    open(A + '/imagens.css', 'w', encoding='utf-8').write(css_img)
    open(A + '/site.js', 'w', encoding='utf-8').write(js)
    vcss, vjs = marca(css_img.encode()), marca(js.encode())
    # o link das imagens vem DEPOIS do <style> da página: na cascata, as fotos precisam ganhar das regras de fundo
    link = ('<!-- Fotos dos balões e ilustrações: um arquivo só, baixado sem travar a primeira pintura -->\n'
            '<link rel="preload" href="assets/imagens.css?v=%s" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">\n'
            '<noscript><link rel="stylesheet" href="assets/imagens.css?v=%s"></noscript>\n') % (vcss, vcss)
    h = h.replace('{{HEAD}}', ler('cabecalho-producao.html')).replace('{{CSS_IMAGENS}}', link)
    h = h.replace('{{SCRIPTS}}', '<script>\n' + ler('rastreamento.js') + '</script>\n<script src="assets/site.js?v=' + vjs + '" defer></script>\n'
                  '<!-- Tag Klicou: atribuição de origem e leads (workspace FAZQVENDE) -->\n<script async src="https://go.klicou.com.br/tag.js?k=kt_e527dcc9a4672020"></script>\n')
    h = fecha(h)
    # conteúdo da visão padrão gravado no HTML: quem não executa JavaScript (robôs de IA) lê o mesmo texto
    r = subprocess.run(['node', AQUI + '/prerender.cjs'], input=json.dumps({'html': h, 'js': js}), capture_output=True, text=True, cwd=RAIZ)
    assert r.returncode == 0, 'prerender falhou (rode npm install): ' + r.stderr[-400:]
    for ident, miolo in json.loads(r.stdout).items():
        h, n = re.subn(r'(<[a-z0-9]+\b[^>]*\bid="%s"[^>]*>)(</)' % ident, lambda m: m.group(1) + miolo + m.group(2), h)
        assert n == 1, 'prerender: #%s não está vazio no fonte' % ident
    h = fecha(h)
    open(RAIZ + '/index.html', 'w', encoding='utf-8').write(h)
    print('produção: index.html %d KB, site.js %d KB, imagens.css %d KB' % (len(h.encode()) // 1024, len(js.encode()) // 1024, len(css_img.encode()) // 1024))
print(NFOTOS, 'fotos,', pessoa, 'pessoas,', len(B), 'balões,', sum(1 for b in B if b[7] is not None), 'no celular')
