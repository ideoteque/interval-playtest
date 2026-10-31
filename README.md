# INTERVAL · Playtest

**[Jogar no navegador](https://ideoteque.github.io/interval-playtest/)**

Interface **v0.4.0**, baseada nas regras pré-fechadas **v0.3**. Edição principal com 90 cartas únicas de 1 a 90. A variante 1–45 não faz parte desta aplicação.

## Dois modos

- **Mesa de teste:** controlas todas as mãos no mesmo ecrã. Ideal para testar decisões dos dois jogadores. Permite 2–5 jogadores, com passagem automática para a mão seguinte.
- **Contra a máquina:** és o jogador «Tu»; os restantes lugares são controlados pela máquina. As outras mãos ficam ocultas.

Entrega uma carta da mão, escolhe uma vizinha imediata no mercado e toca numa casa livre. Também podes arrastar uma vizinha do mercado para a grelha. A carta fica fixa depois da colocação.

## iPad e PC

Abre a ligação no Safari, Chrome, Edge ou Firefox atual. No iPad, a vista horizontal oferece mais espaço para as cartas. A vista vertical também funciona; em ecrãs estreitos, o mercado permite deslocamento horizontal.

No Safari do iPad: **Partilhar → Adicionar ao ecrã principal**. Depois de carregar completamente a aplicação pela primeira vez, os recursos ficam disponíveis para utilização sem ligação, sujeito às políticas de armazenamento do navegador. As atualizações são instaladas quando voltas a abrir com ligação.

Não é necessária conta, chave de API, subscrição ou instalação de pacotes para jogar. O jogo corre no dispositivo.

## Guardar testes

A partida é guardada automaticamente no navegador depois de cada turno completo. Ao reabrir, escolhe **Continuar a partida guardada**. Escolhas ainda não confirmadas numa casa não são guardadas.

Em **Guardar / carregar**, exporta a partida como JSON para continuar noutro dispositivo. A gravação local não sincroniza automaticamente entre iPad e PC. O mesmo código de baralho e número de jogadores reproduzem a distribuição inicial, incluindo o jogador que começa. O botão **Desfazer turno** permite rever decisões; contra a máquina, volta ao teu turno anterior.

## Arte

Cartas, verso, base individual e faixa de mercado vêm da arte original fornecida em 31/10/2026. Os fundos das cartas são SVG e a numeração utiliza **Doto Black**. As imagens das bases e do verso preservam a tipografia da exportação original. A licença OFL da fonte está em `assets/Doto-OFL.txt`.

Distribuição numérica/símbolos mantida: olho 20, disco 20, forma orgânica 20, flor rosa 20 e estrelas 10. A forma orgânica usa agora verde/rosa, conforme a revisão da arte.

## Regras e pontuação

[Livro ilustrado em português](docs/regras.pdf)

| Critério | Pontos |
| --- | ---: |
| Contacto ortogonal de símbolos iguais, cada par uma vez | 1 |
| Contacto estrela–estrela | 2 |
| Linha completa crescente de 4 números | +3 |
| Coluna completa decrescente de 3 números | +1 |
| 4 símbolos iguais na mesma linha | +3 |
| 3 símbolos iguais na mesma coluna | +2 |
| Sequência consecutiva horizontal crescente de 4 | +8 |
| Sequência consecutiva vertical decrescente de 3 | +4 |

Os bónus acumulam. As sequências perfeitas entram no total apenas no final; a previsão aparece separada durante a partida. Não há diagonais, estrelas universais ou ligação entre 90 e 1. Doze turnos por jogador; não há compra no último turno. Empates dão vitória partilhada.

## Adversário automático

É um adversário local com uma heurística determinista: avalia jogadas legais, contactos, ordenação e possibilidades de completar alinhamentos. Não utiliza um modelo de linguagem, não foi treinado por autojogo e não tem acesso à ordem do monte nem às mãos adversárias. Serve para testar e jogar; a sua força ainda precisa de avaliação com pessoas.

## Desenvolvimento

Requer Node.js 20 ou superior. Sem dependências externas.

```sh
npm test
npm start
```

Abre `http://localhost:4173`. Para um iPad na mesma rede, utiliza o endereço de rede do computador e a porta 4173, se o acesso da rede estiver permitido. A instalação e a disponibilidade offline requerem HTTPS ou localhost.

O motor é independente da interface. `scoring.js` preserva a função de pontuação da v0.3. Os testes conferem a preparação contra 16 distribuições da versão original, regras de vizinhança, contactos verticais, acumulação de pontos, partidas de 2–5 jogadores, conservação das cartas, gravação e limites de informação da máquina.

## Publicação

GitHub Pages: em **Settings → Pages → Source**, selecionar **GitHub Actions**. O workflow testa o motor e publica os ficheiros do jogo após cada alteração em `main`. O site é estático e não envia o estado das partidas para um servidor.

Referência de apresentação e movimento: [Eternal Sevens / deckades](https://deckades.net/Sevens/). O código e os recursos dessa referência não foram copiados.
