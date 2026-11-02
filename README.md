# INTERVAL · Playtest

**[Jogar no navegador](https://ideoteque.github.io/interval-playtest/)**

**[Abrir INTERVAL Print Studio](https://ideoteque.github.io/interval-playtest/studio/)** — preparar cartas, mercado e bases em A4, com sangria, miras, calibração de frente/verso e exportação PDF/SVG. [Guia do Studio](studio/README.md).

Interface **v0.5.1**, com o Clássico **v0.3** preservado, Corrida aos Pontos e CO-OP 2vs2 / RAID 2. Edição principal com 90 cartas únicas de 1 a 90. A variante 1–45 não faz parte desta aplicação.

## Controlo dos jogadores

- **Mesa de teste:** controlas todas as mãos no mesmo ecrã. Ideal para testar decisões dos dois jogadores. Permite 2–5 jogadores, com passagem automática para a mão seguinte.
- **Contra a máquina:** és o jogador «Tu»; os restantes lugares são controlados pela máquina. As outras mãos ficam ocultas.

## Modos de jogo v0.5

- **Clássico:** uma partida, 2–5 jogadores, pontuação original v0.3 e vitória partilhada nos empates.
- **Corrida aos Pontos:** partidas completas com classificação acumulada. Metas: 2 jogadores = 45, 3 = 50, 4 ou 5 = 55. O campeonato termina depois de uma partida completa em que alguém atinge a meta; ganha o maior acumulado, com empates partilhados.
- **CO-OP 2vs2:** exatamente quatro jogadores, nas equipas 1A/1B e 2A/2B. As bases A/B são sorteadas dentro de cada equipa no início da sessão. A ordem circular é 1A → 2B → 1B → 2A. A primeira posição nessa ordem é sorteada.

No final do CO-OP, a **base A fica em cima e a B em baixo**, sem espelhar, rodar ou trocar colunas. A linha inferior de A e a superior de B formam até três quadrados 2×2. Cada quadrado de quatro símbolos iguais vale +4; quadrados sobrepostos contam e as estrelas também são válidas. Pelo menos um quadrado completo ativa todos os contactos verticais de símbolos iguais na fronteira: +1 por par normal ou +2 por par de estrelas. Sem quadrado, esses contactos valem zero. Não existem bónus numéricos que atravessem a fronteira.

Cada equipa soma as duas grelhas individuais mais o RAID. A variante admite uma partida única ou **campeonato até 100 pontos por equipa**, com as mesmas regras de verificação final e empates.

Em todos os campeonatos, quem começa é sorteado na primeira partida e **avança um lugar na ordem circular** nas seguintes. As bases A/B mantêm-se atribuídas durante o campeonato; cada partida recebe um novo baralho reproduzível.

O CO-OP digital **não utiliza discos**. O parceiro IA observa apenas as grelhas públicas e procura melhorar a pontuação da equipa, sem aceder às mãos de parceiros/adversários ou à ordem do monte. A coordenação e o equilíbrio dos novos modos continuam sujeitos a playtests humanos.

Entrega uma carta da mão, escolhe uma vizinha imediata no mercado e toca numa casa livre. Também podes arrastar uma vizinha do mercado para a grelha. A carta fica fixa depois da colocação.

## iPad e PC

Abre a ligação no Safari, Chrome, Edge ou Firefox atual. No iPad, a vista horizontal oferece mais espaço para as cartas. A vista vertical também funciona; em ecrãs estreitos, o mercado permite deslocamento horizontal.

No Safari do iPad: **Partilhar → Adicionar ao ecrã principal**. Depois de carregar completamente a aplicação pela primeira vez, os recursos ficam disponíveis para utilização sem ligação, sujeito às políticas de armazenamento do navegador. As atualizações são instaladas quando voltas a abrir com ligação.

Não é necessária conta, chave de API, subscrição ou instalação de pacotes para jogar. O jogo corre no dispositivo.

## Guardar testes

A sessão é guardada automaticamente no navegador depois de cada turno completo, incluindo todas as partidas do campeonato, resultados, classificação e atribuição das bases A/B. Ao reabrir, escolhe **Continuar a sessão guardada**. Escolhas ainda não confirmadas numa casa não são guardadas. As gravações da v0.4 continuam a abrir no Clássico e são convertidas para o novo formato.

Em **Guardar / carregar**, exporta a partida como JSON para continuar noutro dispositivo. A gravação local não sincroniza automaticamente entre iPad e PC. O mesmo código de baralho e número de jogadores reproduzem a distribuição inicial, incluindo o jogador que começa. O botão **Desfazer turno** permite rever decisões; contra a máquina, volta ao teu turno anterior.

## Arte

Cartas e verso vêm da arte original de 31/10/2026; as bases individuais A/B e o mercado utilizam a atualização de **02/11/2026**. A posição das cartas no mercado foi ajustada às novas coordenadas. Os fundos das cartas são SVG e a numeração utiliza **Doto Black**. As imagens das bases e do verso preservam a tipografia da exportação original. A licença OFL da fonte está em `assets/Doto-OFL.txt`.

Distribuição numérica/símbolos mantida: olho 20, disco 20, forma orgânica 20, flor rosa 20 e estrelas 10. A forma orgânica usa agora verde/rosa, conforme a revisão da arte.

## Regras e pontuação

[Livro ilustrado v0.5 em português](docs/regras.pdf), com Clássico, Corrida aos Pontos e CO-OP digital / RAID 2. São 16 páginas de 90 × 120 mm, com a arte original e exemplos de pontuação conferidos com o motor do jogo. [Versão Word editável](docs/regras.docx) e [texto de referência](docs/regras_v0.5.md). O CO-OP descrito corresponde ao digital sem discos; a comunicação física mantém questões de design em aberto.

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

É um adversário local com uma heurística determinista: avalia jogadas legais, contactos, ordenação e possibilidades de completar alinhamentos. No CO-OP, também avalia os quadrados e contactos possíveis com a grelha pública do parceiro. Não utiliza um modelo de linguagem, não foi treinado por autojogo e não tem acesso à ordem do monte nem a outras mãos. Serve para testar e jogar; a sua força ainda precisa de avaliação com pessoas.

## Desenvolvimento

Requer Node.js 20 ou superior. Sem dependências externas.

```sh
npm test
npm start
```

Abre `http://localhost:4173`. Para um iPad na mesma rede, utiliza o endereço de rede do computador e a porta 4173, se o acesso da rede estiver permitido. A instalação e a disponibilidade offline requerem HTTPS ou localhost.

O motor é independente da interface. `scoring.js` preserva a função de pontuação da v0.3; `session.js` gere campeonatos, equipas, RAID, atribuição A/B e gravações. Os 32 testes conferem a preparação contra 16 distribuições originais, vizinhança, pontuação clássica, conservação das cartas, todos os critérios de RAID, acumulação, metas, desempates, ordem cooperativa, rotação inicial, compatibilidade das gravações e informação oculta da máquina.

## Publicação

GitHub Pages: em **Settings → Pages → Source**, selecionar **GitHub Actions**. O workflow testa o motor e publica os ficheiros do jogo após cada alteração em `main`. O site é estático e não envia o estado das partidas para um servidor.

Referência de apresentação e movimento: [Eternal Sevens / deckades](https://deckades.net/Sevens/). O código e os recursos dessa referência não foram copiados.

A correção v0.5.1 usa a ordem CO-OP 1A → 2B → 1B → 2A em novas sessões. Gravações anteriores conservam a ordem original para recuperar exatamente as cartas e decisões; a interface identifica essas sessões como «ORDEM ANTERIOR». Inicia uma nova sessão para testar a ordem corrigida.
