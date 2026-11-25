# Cena 3D do bloco "Foi feito pra mim?"

`cena.js` é o código da cena (three.js). O resultado empacotado fica em `assets/3d/cena-porte.js`
e só é baixado quando o bloco está chegando na tela.

```bash
cd fonte/3d
npm install
npm run build        # regrava assets/3d/cena-porte.js
```

Os dois personagens ficam em `assets/3d/boneco-dados.js` e `assets/3d/mulher-dados.js`
(modelos com esqueleto, embutidos). Eles não são gerados aqui: troque o arquivo inteiro se mudar de modelo.

Depois de mexer na cena, rode `python3 fonte/build.py` na raiz: o `?v=` do arquivo muda sozinho
e nenhum visitante fica com a versão antiga em cache.
