# Roteiro da animacao — Carrinho dentro do WhatsApp Flows

Base: gravacao real de um autoatendimento de farmacia (Android, tema escuro).
Adaptacao: iPhone, WhatsApp tema claro, marca ficticia "Drogaria Exemplo".

## Medidas extraidas do video (device 393pt de largura)

| Elemento | Valor |
|---|---|
| Status bar | 38px |
| Header do chat | ~52px |
| Topo do bottom sheet | ~96px do topo (chat visivel atras) |
| Grabber do sheet | 36x4, 8px abaixo do topo |
| Header do sheet (voltar / titulo / kebab) | ~48px, titulo 17px semibold centralizado |
| Barra de progresso | 4px, margem lateral 16px, logo abaixo do header |
| Padding do conteudo | 20px lateral |
| Botao do rodape | pill, altura ~52px, margem lateral 16px |
| Caption "Gerenciada por..." | 11px, centralizado, acima do home indicator |
| Verde do botao (dark) | #2ED669 — no claro usamos a variavel --wa-green |

## Sequencia (13 telas + abertura e fechamento no chat)

| # | Tela | Conteudo | Acao simulada |
|---|---|---|---|
| 0 | Chat | Mensagem de boas-vindas com imagem + botao "Montar meu pedido" | toque no botao, sheet sobe |
| 1 | Escolha a loja | "Onde voce quer comprar?" + 2 lojas (radio) | seleciona Centro, Continuar |
| 2 | Seu CPF | "Vamos comecar" + input CPF + teclado numerico | digita 11 digitos, Continuar |
| 3 | Buscar produto | busca + "Ver por categoria" + ofertas do dia | digita "Dipirona", Buscar |
| 4 | Resultados | lista de variantes com preco/laboratorio (radio) | seleciona uma, Ver produto |
| 5 | Produto | preco, disponibilidade, laboratorio, codigo de barras + quantidade | escolhe 1 unidade, Adicionar ao carrinho |
| 6 | Seu carrinho | item, total, loja + "Adicionar mais itens" | toca em Adicionar mais itens |
| 7 | Categorias | NavigationList com contagem de produtos | toca em "Fraldas, absorventes e lencos" |
| 8 | Produtos | lista da categoria com preco e estoque | toca em um item |
| 9 | Produto | detalhes do segundo item + quantidade 2 | Adicionar ao carrinho |
| 10 | Seu carrinho | 2 itens, total atualizado | Finalizar pedido |
| 11 | Como receber | retirar na loja / receber em casa / endereco salvo | seleciona endereco salvo, Continuar |
| 12 | Pagamento | Pix / link / cartao / dinheiro + troco | seleciona Pix, Continuar |
| 13 | Confirmar pedido | resumo completo: itens, total, loja, entrega, pagamento, CPF | Confirmar pedido |
| 14 | Chat | sheet fecha, bolha "Resposta enviada" + "Obrigado pela compra..." | reinicia o loop |

## Regras de fidelidade

- Componentes reais do Flows: TextHeading, TextBody, TextCaption, TextInput,
  RadioButtonsGroup, Dropdown, NavigationList, Footer (1 botao por tela).
- Rodape sempre com 1 botao; desabilitado ate a selecao obrigatoria.
- Barra de progresso avanca a cada tela.
- Transicao horizontal (nova tela entra pela direita).
- Teclado do iOS sobe por cima do rodape nos campos de texto.
- Caption "Gerenciada por Drogaria Exemplo. Saiba mais" fixo no rodape do sheet.
