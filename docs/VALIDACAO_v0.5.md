# INTERVAL v0.5 — validação e limites

Estado de preparação em 02/11/2026.

## Decisões confirmadas pelo autor nesta conversa

- Implementar os novos modos da especificação de regras v0.5, preservando o Clássico.
- Base RAID 2 A em cima, B em baixo; junção pelas setas no final, com colunas alinhadas e sem rotação.
- Sortear A/B dentro de cada equipa. A implementação mantém essa atribuição durante um campeonato.
- Sortear quem começa a primeira partida e avançar um lugar nas partidas seguintes.
- Testar parceiro IA coordenado apenas pelo estado público das grelhas, sem discos ou partilha de mãos.
- Manter as cartas de 50,8 mm. A hipótese de 70 mm e os materiais físicos de produção não são alterados.

## Verificações executadas

- 30 testes automáticos do motor: todos aprovados.
- Compatibilidade da preparação clássica com 16 distribuições da v0.3.
- Pontuação individual, contactos verticais e prémios perfeitos sem alterações.
- Quadrados cooperativos sobrepostos; ativação dos contactos; estrelas e limite de 20 pontos de RAID.
- Ordem circular 1A–2A–1B–2B e papéis A/B sorteados.
- Campeonatos completos, metas corretas, verificação após a partida e empates.
- Gravações de campeonatos, migração de gravações v0.4 e desfazer resultados.
- IA cooperativa independente da ordem do monte e das mãos ocultas, incluindo a do parceiro.
- Sete verificações funcionais da interface num DOM de teste: Clássico completo, Corrida completa, CO-OP completo, campeonato cooperativo até 100, humano com parceiro IA, recuperação/importação e regras/recursos.
- As cópias das imagens de tabuleiro provêm dos PNG/SVG originais de 02/11/2026.

## Verificação ainda pendente

O acesso automatizado ao navegador esteve indisponível por uma falha de arranque do ambiente de controlo. Os testes funcionais de DOM não verificam renderização, toque, animações ou disposição real no Safari/Chrome. É necessária a revisão visual no navegador antes de considerar esta versão totalmente validada.

Os novos modos são versões de playtest. A dificuldade da IA, a duração dos campeonatos e o equilíbrio das metas/bónus continuam por avaliar com pessoas.

O livro PDF incluído continua a documentar o Clássico v0.3. As novas regras constam da ajuda da aplicação e do README.
