# INTERVAL Print Studio

Studio local de preparação de impressão caseira. Publicação: https://ideoteque.github.io/interval-playtest/studio/

## O que faz

- Arte PNG, JPG, WebP, SVG e PDF multipágina. Uma imagem/página por carta ou base; mercado numa peça aberta de 480 × 90 mm.
- Arte INTERVAL integrada: 90 cartas e verso, mercado atualizado e cinco bases (3 A + 2 B, quantidades editáveis).
- Perfis Equilibrada e Bases Planas. Mantêm dimensões abertas; diferem nas marcas de dobra. Não é um gerador de facas da caixa ou do berço.
- Carta final 50,8 × 50,8 mm, base 240 × 190 mm, mercado 480 × 90 mm. A4 a tamanho real.
- Perfil inicial de margens de 3 mm para a Epson ET-2951, ajustável para margens maiores. Sangria de saída ajustável entre 0 e 6 mm.
- Frentes/versos alternados ou separados, verso comum ou individual, viragem por borda longa/curta e compensação X/Y em milímetros.
- Folha de calibração de duas faces com cruzes e régua de 100 mm.
- PDF com arte rasterizada à resolução escolhida e guias vetoriais; páginas SVG com arte incorporada e guias editáveis, num ZIP. Nas fontes SVG, a área central mantém a imagem SVG vetorial; sangria prolongada usa píxeis. PDF importado é rasterizado na saída.
- Persistência no IndexedDB deste navegador e exportação/importação de projeto com toda a arte. Não existe upload para um servidor ou sincronização entre dispositivos.

## Aproveitamento inicial

Com margens de 3 mm, sangria de 3 mm e miras periféricas de 2 mm:

- Cartas: 3 × 5, 15 por face, 6 folhas para 90 cartas em frente e verso; PDF de 12 páginas alternadas.
- Mercado: duas metades de 240 × 90 mm numa A4 horizontal. A sangria na união contém a continuação da arte. Cortar pelo tamanho final e unir borda com borda pelo verso, sem sobrepor a área de jogo.
- Bases: uma base aberta por A4 horizontal; 5 folhas no conjunto inicial.

As miras ficam fora do bloco de sangria e são retiradas no corte. Não existem linhas de corte sobre as faces finais das cartas. As marcas roxas de dobra ficam apenas fora da arte. A pré-visualização acrescenta um contorno tracejado de corte que não sai nos ficheiros finais.

Aumentar margens pode reduzir o número de cartas por folha ou impedir uma base de caber. O Studio recalcula ou bloqueia a exportação em vez de reduzir fisicamente as peças. Uma correção de verso que faça sair arte/miras da área imprimível também bloqueia a exportação.

## Sangria e fontes

O utilizador indica se cada conjunto de ficheiros já tem sangria. A forma quadrada de uma carta não permite deduzir automaticamente essa escolha. O tamanho de sangria existente é independente da sangria de saída, para evitar acrescentá-la duas vezes.

Para arte só de corte, a área central fica intacta e os píxeis da borda são prolongados. Não é arte nova nem reconstrução de elementos cortados. Na impressão caseira, confirmar a prévia e fazer uma prova.

SVG importado é limpo de scripts e recursos externos. Regras simples de apresentação são também incorporadas nos elementos para melhorar a portabilidade. Fontes devem vir incorporadas ou convertidas em curvas. O exemplo usa SVG original nas cartas com Doto Black incorporada e PNG exportado pelo autor nas bases/mercado para preservar a tipografia exata desses elementos.

## Impressão e montagem

Imprimir a 100% / tamanho real, sem «Ajustar», sem redução automática e sem impressão sem margens. O PDF define PrintScaling=None, mas o leitor/controlador pode substituir essa preferência. A aplicação não configura a impressora.

O ponto de partida de 3 mm vem das especificações oficiais da ET-2951: https://www.epson.pt/pt_PT/p/52035

Testar primeiro a régua e a coincidência das cruzes. O percurso de reinserção manual depende da impressora e do papel. Usar papel compatível e montar as impressões nos suportes dos tabuleiros depois de imprimir; a app não valida a alimentação de cartão rígido ou o acabamento das charneiras.

## Verificações

- 11 testes do motor de paginação em `tests/studio.test.js`: capacidade, tamanho físico, margens, páginas parciais, correspondência de versos, compensação, metades do mercado, cópias das bases, dobras e validação do projeto.
- Verificações funcionais de DOM com canvas nativo: carregamento do exemplo completo, navegação, recálculo, projetos, exportações PDF/SVG/ZIP e importação/renderização de PDF multipágina.
- PDFs reais gerados e dimensões/arte conferidas por rasterização. Isto não substitui prova física na ET-2951.
- O controlo automático do navegador esteve indisponível no ambiente de desenvolvimento. A apresentação e os downloads em Safari/iPad precisam de revisão humana no dispositivo; não foram declarados como testados num iPad real.

## Dependências incorporadas

Sem serviços externos em tempo de execução. Bibliotecas vendorizadas:

- pdf-lib 1.17.1 — MIT. https://pdf-lib.js.org/
- PDF.js / pdfjs-dist 6.5.438, legacy build — Apache 2.0. https://mozilla.github.io/pdf.js/
- JSZip 3.10.2 — MIT ou GPLv3; utilizado sob MIT. https://stuk.github.io/jszip/

Licenças mantidas em `vendor/`. A tipografia Doto mantém a licença OFL já incluída nos recursos do jogo.

Os ficheiros importados ficam no projeto do utilizador, não no repositório. A cache offline tem prefixo próprio e âmbito `/studio/`, independente da aplicação de jogo.
