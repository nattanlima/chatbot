# Design da animacao — Concatenador de Mensagens

## Tese

O atendente escreve do jeito que ja escreve, em rajada. As mensagens ficam numa
bandeja, a janela de tempo fecha e tudo sai como UMA mensagem. Seis cobrancas
viram uma.

## Por que o movimento e outro

Flows mostra navegacao, Modo Hibrido mostra um controle mudando um numero.
Aqui o movimento e o MERGE: seis itens visiveis colapsam em um balao so.
E um gesto que a pagina ainda nao usou, entao a secao nao parece o terceiro
ato da mesma peca.

## Mecanica (confirmada pelo Nattan)

- Agrupamento por janela de tempo automatica, com contagem regressiva.
- Vale so para as mensagens do atendente (saida). Nao agrupa entrada do cliente.
- Seis mensagens no exemplo.

## Numeros (taxa R$ 0,035/msg)

| Item | Conta | Valor |
|---|---|---|
| Sem concatenador | 6 x 0,035 | R$ 0,21 |
| Com concatenador | 1 x 0,035 | R$ 0,035 |
| Economia por atendimento | 0,21 - 0,035 | R$ 0,175 |
| Em 1.000 atendimentos | 1.000 x 0,21 vs 1.000 x 0,035 | R$ 210,00 -> R$ 35,00 |

A projecao mensal declara a premissa na propria tela ("em 1.000 atendimentos com
esse padrao"), porque nem toda rajada tem seis mensagens. Numero sem premissa
declarada vira promessa que a fatura nao confirma.

## Roteiro (~15s em loop)

| Tempo | O que acontece |
|---|---|
| 0,0s | Cliente pergunta; o balao aparece no painel e no celular |
| 1,5s a 6,2s | O atendente digita as 6 mensagens. Cada uma passa pelo campo de texto e cai na bandeja com o custo fantasma riscado ao lado. O contador "sem concatenador" sobe de 0,035 ate 0,21 |
| 6,2s a 8,5s | Contagem regressiva da janela: 3s, 2s, 1s, com o anel se fechando |
| 8,5s a 9,2s | Merge: os seis itens colapsam para baixo, a bandeja some |
| 9,2s | Um unico balao entra no chat com as seis linhas, etiqueta "1 mensagem · R$ 0,035" e um pulso de destaque. A economia aparece no rail |
| 9,7s | O mesmo balao chega no celular e sobe o chip "1 notificacao, nao 6" |
| ate 15s | Repouso e reinicio |

## Conversa

| Quem | Mensagem |
|---|---|
| Cliente | Oi! Meu pedido ja esta pronto? |
| Loja | Oi, Marina! Tudo certo por aqui. |
| Loja | Seu pedido ja esta separado. |
| Loja | Sao 2 caixas do generico e 1 do xarope. |
| Loja | Total deu R$ 47,80. |
| Loja | Pode retirar hoje ate as 18h. |
| Loja | Qualquer coisa e so me chamar. |

## Decisoes de design

- A bandeja e tracejada e indigo, nao verde: ela e estado intermediario, nao
  resultado. O verde fica reservado para o que ja virou economia.
- O custo fantasma de cada item aparece riscado, para o visitante ver o que
  deixaria de ser pago antes mesmo do merge.
- O chip do celular fica na area vazia do wallpaper, acima dos baloes. Embaixo
  ele cobria a mensagem.
- Movimento reduzido monta o quadro final de uma vez, em vez de acelerar o loop.
