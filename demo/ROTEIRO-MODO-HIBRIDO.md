# Design da animacao — Modo Hibrido

## Tese da secao

Mesma conversa, dois pontos de vista. A unica diferenca entre os dois lados e o preco.
O lado do atendente carrega o custo; o lado do cliente nao carrega nada.
Se dinheiro aparecer nos dois lados, a assimetria some e a secao perde a razao de existir.

## Regras de leitura

1. O painel e o ator, o celular e a consequencia. A acao comeca sempre no painel e
   o balao so chega no celular ~400ms depois. Esse atraso cria a leitura de causa e efeito.
2. So um lado acumula numero. Contador e ima de atencao e pertence ao painel.
3. Tag da rota oficial em cinza neutro, nunca vermelho. Vermelho diria "oficial e ruim"
   e contradiz a secao Coex, que vende a seguranca da API oficial.
4. Verde so no que foi economizado.
5. Checks de entrega ficam no painel (quem envia), nao no celular (quem recebe).
   No celular, as mensagens da loja sao balao branco de entrada, sem check.

## Numeros (taxa definida pelo Nattan: R$ 0,035/msg)

| Item | Conta | Valor |
|---|---|---|
| Mensagens no mes | — | 12.000 |
| Percentual hibrido | — | 70% |
| Sem Modo Hibrido | 12.000 x 0,035 | R$ 420,00 |
| Com Modo Hibrido | 3.600 oficiais x 0,035 | R$ 126,00 |
| Economia | 8.400 hibridas x 0,035 | R$ 294,00 |
| Caixa do modal | 700 x 0,035 por 1.000 msgs | R$ 24,50 |

A amostra visivel na animacao tem 6 mensagens enviadas, 4 pela hibrida (66,7%),
que e a aproximacao inteira mais proxima dos 70% configurados.

## Roteiro (~18s em loop)

| Tempo | O que acontece |
|---|---|
| 0,0s | Painel visivel, modal do Modo Hibrido abrindo |
| 0,5s a 3,5s | Slider sai de 0% e sobe ate 70%; o numero conta junto; a caixa lilas recalcula; o rail de custo anima de R$ 420,00 para R$ 126,00 e a economia sobe para R$ 294,00 |
| 3,5s a 4,2s | Clique em Salvar, modal fecha |
| 4,2s a 15s | 8 baloes: 2 do cliente e 6 da loja, ~1,3s cada. Cada balao da loja recebe a etiqueta da rota e o custo, e 400ms depois o mesmo balao chega no celular, limpo |
| 15s a 18s | Estado final em repouso, depois reinicia |

## Conversa

| # | Quem | Mensagem | Rota |
|---|---|---|---|
| 1 | Cliente | Oi! Chegou aquele remedio que eu pedi? | — |
| 2 | Loja | Oi, Marina! Chegou sim, acabou de entrar. | Hibrida |
| 3 | Loja | Quer que eu ja separe uma caixa? | Hibrida |
| 4 | Cliente | Quero sim, por favor | — |
| 5 | Loja | Separado! Retira hoje ate as 18h? | Oficial |
| 6 | Loja | Te mando o codigo do Pix por aqui. | Hibrida |
| 7 | Loja | Pix enviado. Qualquer coisa e so chamar. | Hibrida |
| 8 | Loja | Pedido #4821 confirmado. | Oficial |

## Layout

Desktop: painel dominando (ate 720px) com o celular sobreposto no canto inferior direito.
O celular menor reforca a hierarquia: o painel e onde a decisao acontece, o celular e so
a confirmacao de que nada mudou.

Mobile: o layout reflui em vez de escalar. O rail de custo sai do painel e vira uma grade
de cartoes abaixo dele; o celular desce para baixo do painel. Escalar tudo deixaria o texto
do painel em 7px, ilegivel.

## Ajustes do mockup em relacao a tela real do painel

1. Sai o parentese "(nao oficial)" da caixa de calculo; fica "conexao hibrida".
2. "9205 QR CODE (#68)" vira "Conexao do app"; ID interno so confunde numa LP.
3. Sai o "($3.60)"; dolar entre parenteses sugere preco oscilando com cambio.
4. Fica o "Valor estimado", que protege a promessa.
5. A taxa exibida passa a ser R$ 0,035, a mesma que o painel ja usa no calculo.
