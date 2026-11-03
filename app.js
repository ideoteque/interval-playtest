import {setup,current,round,neighbors,intervalScore,VERSION} from './engine.js';
import {createSession,sessionMove,nextRound,sessionRecord,restoreSession,teamResult,target,sessionWinners,chooseSessionMove,undoSession} from './session.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ASSETS=['eye','record','severance','x-code','star'];
const NAMES=['olho','disco','forma orgânica','flor rosa','estrela'];
const STORE='interval-playtest-v05';
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
let game=null,mode='ai',history=[],offered=null,taken=null,busy=false,generation=0,saved=null,driverActive=false;
let session=null;
for(const key of [STORE,'interval-playtest-v04']){try{const raw=localStorage.getItem(key);if(raw){const rec=JSON.parse(raw);restoreSession(rec);saved=rec;break;}}catch{}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const coop=()=>session?.options.variant==='coop';
const championship=()=>session?.options.championship===true;
const name=p=>coop()?`${mode==='manual'?'Jogador':p===0?'Tu':p===2?'Parceiro IA':'IA'} · ${session.roles[p].team+1}${session.roles[p].board}`:mode==='ai'?(p===0?'Tu':`Máquina${game.n>2?' '+p:''}`):`Jogador ${String.fromCharCode(65+p)}`;
const variantName=()=>({classic:'CLÁSSICO',race:'CORRIDA AOS PONTOS',coop:'CO-OP 2vs2'})[session?.options.variant||'classic'];
function sync(s){session=s;game=s.game;mode=s.options.mode;history=s.rounds.at(-1).moves;}
const isAI=()=>!!game&&mode==='ai'&&current(game)!==0&&!game.done;
const canAct=()=>!!game&&!game.done&&!busy&&!isAI();
const pointWord=n=>n===1?'ponto':'pontos';
const cardHTML=c=>`<span class="card" data-card="${c.v}" data-k="${c.k}"><img src="assets/${ASSETS[c.k]}.svg" alt="" draggable="false"><svg viewBox="0 0 144 144" aria-hidden="true"><text x="11.34" y="35.16">${c.v}</text><text transform="translate(132.66 108.84) rotate(180)">${c.v}</text></svg></span>`;
const backHTML=()=>'<span class="card"><img src="assets/back.png" alt="Verso de carta" draggable="false"></span>';
const cardLabel=c=>`${c.v}, ${NAMES[c.k]}`;
function announce(t){$('#live').textContent=t;}
function toast(t){$('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.textContent=t;el.setAttribute('role','status');document.body.append(el);setTimeout(()=>el.remove(),4500);}
function save(){
 if(!game)return;
 saved=sessionRecord(session);
 try{localStorage.setItem(STORE,JSON.stringify(saved));$('#save-status').textContent='GUARDADO NESTE DISPOSITIVO';}catch{$('#save-status').textContent='USA «GUARDAR» PARA EXPORTAR';}
}
function score(p){return intervalScore(game.players[p].grid,3,game.done);}
function renderBoards(){
 const boardHTML=p=>{const a=game.players[p];
  const s=score(p),active=!game.done&&current(game)===p;
  const art=coop()?`motherboard-${session.roles[p].board.toLowerCase()}.png`:'motherboard.png';
  return `<article class="player-board ${active?'active':''}" data-player="${p}"><div class="player-title"><strong>${name(p)}</strong><small>${a.grid.filter(Boolean).length}/12</small><button class="player-score" data-score="${p}" aria-label="Ver pontuação de ${name(p)}"><b>${s.total}</b> pts${!game.done&&s.finalBonusPotential?`<sup>+${s.finalBonusPotential} no fim</sup>`:''}</button></div><div class="mat"><img class="board-art" src="assets/${art}" alt="Base ${coop()?session.roles[p].board:'individual'} com grelha de três linhas e quatro colunas">${a.grid.map((c,i)=>{
   const left=([48.05,194.77,341.49,488.2][i%4]/680.31)*100,top=([49.15,197.29,345.44][Math.floor(i/4)]/538.58)*100;
   const available=!c&&active&&taken!==null&&canAct();
   return `<button class="cell ${c?'occupied':'empty'} ${available?'available':''}" style="left:${left}%;top:${top}%" data-cell="${i}" data-player="${p}" ${available?'':'disabled'} aria-label="${name(p)}, linha ${Math.floor(i/4)+1}, coluna ${i%4+1}${c?', '+cardLabel(c):', casa livre'}">${c?cardHTML(c):''}</button>`;
  }).join('')}</div></article>`;
 };
 $('#boards').classList.toggle('coop-boards',coop());
 if(coop())$('#boards').innerHTML=[0,1].map(team=>{const a=session.roles.findIndex(r=>r.team===team&&r.board==='A'),b=session.roles.findIndex(r=>r.team===team&&r.board==='B');return `<section class="team-stack ${game.done?'joined':''}" aria-label="Equipa ${team+1}, base A em cima e B em baixo"><div class="team-heading">EQUIPA ${team+1}<span>${game.done?'RAID 2 · UNIÃO FINAL':'A ↓ · ↑ B'}</span></div>${boardHTML(a)}${game.done?'<div class="raid-seam" aria-label="Fronteira RAID 2"></div>':''}${boardHTML(b)}</section>`;}).join('');
 else $('#boards').innerHTML=game.players.map((_,p)=>boardHTML(p)).join('');
}
function renderMarket(){
 const a=game.players[current(game)];
 const card=offered!==null?a.hand[offered]:null;
 const cards=card?[...game.market,card].sort((a,b)=>a.v-b.v):game.market;
 const legal=offered===null?[]:neighbors(game,offered);
 $('#market-cards').innerHTML=cards.map((c,i)=>{
  const isOffer=card?.v===c.v,highlight=legal.includes(c.v)&&taken===null,allowed=highlight&&canAct(),draggable=taken===c.v&&canAct();
  const left=([23.6,188.01,352.42,516.83,693.57,857.98,1022.39][i])/1360.63*100;
  return `<button class="market-card ${isOffer?'offered':''} ${highlight?'legal':''} ${taken===c.v?'chosen':''} ${card&&!legal.includes(c.v)&&!isOffer?'dimmed':''}" data-market="${c.v}" style="left:${left}%;touch-action:${allowed||draggable?'none':'auto'}" ${allowed||draggable?'':'disabled'} aria-label="${cardLabel(c)}${isOffer?', carta entregue, não pode ser retirada':allowed?', vizinha disponível':''}">${cardHTML(c)}</button>`;
 }).join('');
 $('#draw-pile').innerHTML=game.deck.length?`<div class="pile-position">${backHTML()}</div>`:'';
 $('#deck-count').textContent=`${game.deck.length} NO MONTE`;
 $('#offer-slot').innerHTML='';
}
function renderHand(){
 const a=game.players[current(game)],ai=isAI();
 $('#hand').innerHTML=game.done?'':a.hand.map((c,h)=>ai?`<div class="hand-back" style="--angle:${(h-1)*8}deg">${backHTML()}</div>`:`<button class="hand-card ${offered===h?'selected':''}" style="--angle:${(h-(a.hand.length-1)/2)*9}deg;--z:${h+1};${offered===h?'visibility:hidden;':''}" data-hand="${h}" ${canAct()?'':'disabled'} aria-label="Entregar ${cardLabel(c)}" aria-pressed="${offered===h}">${cardHTML(c)}</button>`).join('');
 $('#hand-label').textContent=game.done?'PARTIDA TERMINADA':ai?'MÃO DA MÁQUINA · OCULTA':mode==='ai'?'A TUA MÃO':`MÃO DO ${name(current(game)).toUpperCase()}`;
}
function renderInstruction(){
 const ai=isAI(),p=current(game);
 const step=offered===null?0:taken===null?1:2;
 $('#steps').hidden=game.done;
 $$('#steps span').forEach((el,i)=>{el.className=i===step?'active':i<step?'passed':'';});
 let title,hint;
 if(game.done){title='Cada espaço contou.';hint='A pontuação final já inclui todos os bónus de sequência.';}
 else if(offered===null){title=ai?'A máquina está a escolher…':'Entrega uma carta.';hint=ai?'As mãos e a ordem do monte ficam em segredo.':'Toca numa carta da mão para a inserir no mercado.';}
 else if(taken===null){title=ai?'A máquina procura o intervalo…':'Escolhe uma vizinha.';hint=`Entregaste o ${game.players[p].hand[offered].v}. A carta esbatida é a que entregaste e não pode ser retirada. Escolhe uma das vizinhas a amarelo.`;}
 else{title=ai?'A máquina encontrou um lugar.':`Onde fica o ${taken}?`;hint=ai?'A carta vai ocupar uma casa livre.':'Toca numa casa livre da tua grelha. Ou arrasta a carta até lá.';}
 $('#turn-kicker').textContent=game.done?'FIM DA PARTIDA':`${name(p).toUpperCase()} · TURNO ${round(game)} DE 12`;
 $('#instruction').textContent=title;$('#hint').textContent=hint;
 $('#cancel-btn').hidden=offered===null||ai||game.done;
 $('#cancel-btn').disabled=busy;
 $('#undo-btn').disabled=busy||driverActive||!history.length;
 $('#round-label').textContent=`${championship()?`PARTIDA ${session.rounds.length} · `:''}${game.done?'FINAL':`RONDA ${round(game)} / 12`} · BARALHO ${game.seed}`;
 $('#mode-label').textContent=`${variantName()} · ${mode==='ai'?(coop()?'TU + PARCEIRO IA × IA + IA':'TU × MÁQUINA'):'MESA DE TESTE'}`;
 if(coop()&&session.options.coopOrder==='legacy')$('#mode-label').textContent+=' · ORDEM ANTERIOR';
}
function renderStandings(){
 const el=$('#session-bar');el.hidden=!championship()&&!coop();if(el.hidden)return;
 const labels=coop()?['Equipa 1','Equipa 2']:game.players.map((_,p)=>name(p));
 const values=championship()?session.totals:[0,1].map(t=>teamResult(session,t).total);
 el.innerHTML=`<div class="session-caption">${championship()?`PARTIDA ${session.rounds.length} · META ${target(session)} PONTOS`:'PONTUAÇÃO CONJUNTA · RAID 2 NO FINAL'}</div><div class="session-scores">${labels.map((label,i)=>`<button class="session-score" ${coop()?`data-team-score="${i}"`:'data-standings'}>${label}<b>${values[i]}</b>${championship()?`<small>/ ${target(session)}</small>`:''}</button>`).join('')}${championship()?'<button class="quiet" data-standings>Classificação ↗</button>':''}${game.done&&!session.finished?'<button class="primary" data-next-round>Próxima partida →</button>':''}</div>`;
}
function render(){if(!game)return;renderStandings();renderBoards();renderMarket();renderHand();renderInstruction();}
function rect(el){return el?.getBoundingClientRect();}
async function fly(c,from,to){
 if(!from||!to||reduce.matches)return;
 const el=document.createElement('div');el.className='flying-card';el.innerHTML=cardHTML(c);
 Object.assign(el.style,{left:`${from.x}px`,top:`${from.y}px`,width:`${from.width}px`,height:`${from.height}px`});document.body.append(el);
 try{await el.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${to.x-from.x}px,${to.y-from.y}px) scale(${to.width/from.width})`,opacity:1}],{duration:420,easing:'cubic-bezier(.22,.7,.22,1)',fill:'forwards'}).finished;}finally{el.remove();}
}
async function selectOffer(h,automated=false){
 if((!automated&&!canAct())||busy||!game.players[current(game)].hand[h])return;
 const gen=generation,c=game.players[current(game)].hand[h],from=rect($(`[data-hand="${h}"] .card`)||$('.hand .card'));
 offered=h;taken=null;busy=true;render();
 const target=$(`[data-market="${c.v}"]`);const prev=target.style.visibility;target.style.visibility='hidden';
 await fly(c,from,rect(target));if(gen!==generation)return;target.style.visibility=prev;busy=false;render();
 announce(`Carta ${c.v} entregue. Escolhe ${neighbors(game,h).join(' ou ')}.`);
 if(!automated)$(`[data-market="${neighbors(game,h)[0]}"]`)?.focus({preventScroll:true});
}
function takeNeighbor(v,automated=false){
 if((!automated&&!canAct())||busy||offered===null||!neighbors(game,offered).includes(v))return;
 taken=v;render();announce(`Carta ${v} selecionada. Escolhe uma casa livre.`);
 if(!automated)$(`.player-board.active .available`)?.focus({preventScroll:true});
}
async function place(cell,automated=false){
 if((!automated&&!canAct())||busy||taken===null)return;
 const gen=generation,p=current(game),m={h:offered,v:taken,cell},c=game.market.find(c=>c.v===taken),from=rect($(`[data-market="${taken}"]`)),to=rect($(`.cell[data-player="${p}"][data-cell="${cell}"]`));
 let next;try{next=sessionMove(session,m);}catch(e){toast(e.message);return;}
 busy=true;render();
 await fly(c,from,to);
 if(gen!==generation)return;
 sync(next);offered=null;taken=null;busy=false;save();render();
 announce(`${name(p)} colocou ${c.v} na linha ${Math.floor(cell/4)+1}, coluna ${cell%4+1}.`);
 if(!game.done){const draw=game.players[p].hand.at(-1);if(current(game)===p&&draw)await fly(draw,rect($('.pile-position')),rect($('.hand .card')));}
 if(game.done){showResults();return;}
 if(!automated)driveAI();
}
async function driveAI(){
 if(driverActive||!isAI())return;
 driverActive=true;renderInstruction();const gen=generation;
 const check=async()=>{while($$('dialog[open]').length&&gen===generation)await sleep(180);return gen===generation;};
 try{
  while(isAI()&&gen===generation){
   if(!await check())return;
   await sleep(reduce.matches?80:650);if(!await check())return;
   const m=chooseSessionMove(session);await selectOffer(m.h,true);
   await sleep(reduce.matches?40:400);if(!await check())return;takeNeighbor(m.v,true);
   await sleep(reduce.matches?40:500);if(!await check())return;await place(m.cell,true);
  }
 }catch(e){toast('Não foi possível concluir a jogada. A partida está guardada.');console.error(e);}
 finally{if(gen===generation){driverActive=false;render();if(canAct())$('[data-hand="0"]')?.focus({preventScroll:true});}}
}
function start(n,seed,newMode,variant='classic',teamRace=false){
 generation++;offered=null;taken=null;busy=false;driverActive=false;sync(createSession({n,seed,mode:newMode,variant,championship:teamRace}));save();render();$('#setup-dialog').close();announce(`Começa ${name(current(game))}.`);driveAI();
}
function resume(record){
 const restored=restoreSession(record);generation++;sync(restored);offered=null;taken=null;busy=false;driverActive=false;save();render();$('#setup-dialog').close();if(coop()&&session.options.coopOrder==='legacy')toast('Esta gravação mantém a ordem anterior. Inicia uma nova sessão CO-OP para usar a ordem corrigida.');if(game.done)showResults();else driveAI();
}
function advance(){if(!game?.done||session.finished||busy)return;try{const next=nextRound(session);generation++;offered=null;taken=null;busy=false;driverActive=false;sync(next);$('#info-dialog').close();save();render();announce(`Partida ${session.rounds.length}. Começa ${name(current(game))}.`);driveAI();}catch(e){toast(e.message);}}
function setupDialog(){
 $('#resume-btn').hidden=!saved;$('#setup-error').textContent='';$('#setup-dialog [data-close]').hidden=!game;
 $('#setup-dialog').showModal();
}
function info(content,eyebrow='INTERVAL'){ $('#info-content').innerHTML=content;$('#info-eyebrow').textContent=eyebrow;$('#info-dialog').showModal(); }
const summaryRows=[['Contacto de símbolos iguais','1 / par'],['Contacto estrela–estrela','2 / par'],['Linha crescente (4 cartas)','+3'],['Coluna decrescente (3 cartas)','+1'],['4 símbolos iguais na horizontal','+3'],['3 símbolos iguais na vertical','+2'],['Sequência perfeita horizontal crescente','+8'],['Sequência perfeita vertical decrescente','+4']];
function tableRows(rows){return rows.map(([a,b])=>`<tr><td>${a}</td><td>${b}</td></tr>`).join('');}
function breakdown(p){
 const s=score(p),grid=game.players[p].grid;
 const pairs=[...s.horizontal,...s.vertical].map(([a,b])=>`${grid[a].v}–${grid[b].v}${grid[a].k===4?' (2 pts)':''}`).join(', ')||'nenhum';
 const rows=[['Contactos horizontais',s.horizontalPoints],['Contactos verticais',s.verticalPoints],['Linhas crescentes · +3 cada',s.rows],['Colunas decrescentes · +1 cada',s.descendingCols],['Linhas de símbolos iguais · +3 cada',s.symbolRows],['Colunas de símbolos iguais · +2 cada',s.symbolCols],['Sequências horizontais · +8 cada',s.perfectRows],['Sequências verticais · +4 cada',s.perfectCols]];
 return `<section class="score-section"><h3>${name(p)}</h3><table class="score-table"><tbody>${tableRows(rows)}</tbody><tfoot><tr><td>${game.done?'Total final':'Total atual'}</td><td>${s.total}</td></tr></tfoot></table>${!game.done?`<p class="score-preview">Previsão final: <b>${s.baseTotal+s.finalBonusPotential}</b> pontos. Os ${s.finalBonusPotential} pontos de sequências entram apenas no fim.</p>`:''}<p class="score-detail"><b>Pares em contacto:</b> ${pairs}.<br>Cada par conta uma vez. Inclui contactos verticais entre as três linhas.</p></section>`;
}
function teamBreakdown(t){
 const r=teamResult(session,t),c=r.coop,gridA=game.players[r.a].grid,gridB=game.players[r.b].grid;
 const squares=c.squares.map(s=>`colunas ${s.column+1}–${s.column+2} (${NAMES[s.family]})`).join('; ')||'nenhum';
 const pairs=c.contacts.map(e=>`coluna ${e.column+1}: ${e.values.join('–')} (${e.points} pts${c.activated?'':', inativo'})`).join('; ')||'nenhum';
 return `<section class="score-section"><h3>Equipa ${t+1} · RAID 2</h3><div class="frontier-preview" aria-label="Linha inferior de A unida à linha superior de B"><span>Base A · linha 3</span><div>${gridA.slice(8).map(x=>x?cardHTML(x):'<span class="frontier-empty"></span>').join('')}</div><div>${gridB.slice(0,4).map(x=>x?cardHTML(x):'<span class="frontier-empty"></span>').join('')}</div><span>Base B · linha 1</span></div><table class="score-table"><tbody>${tableRows([[name(r.a),r.individual[0]],[name(r.b),r.individual[1]],[`Quadrados 2×2: ${c.squares.length} × 4`,c.squarePoints],[`Contactos da fronteira: ${c.activated?'ativados':'inativos'}`,c.contactPoints],['RAID contabilizado nesta partida',game.done?c.total:0]])}</tbody><tfoot><tr><td>Total da equipa</td><td>${r.total}</td></tr></tfoot></table><p class="score-detail"><b>Quadrados:</b> ${squares}.<br><b>Contactos:</b> ${pairs}.<br>${game.done?'As grelhas juntam-se A em cima e B em baixo.':'Prévia dos padrões já presentes. O bónus RAID só entra no final.'} Os quadrados sobrepostos contam; basta um para ativar todos os pares iguais da fronteira.</p></section>`;
}
function showScores(p=null){if(!game)return;info(`<div class="score-content"><h2>Cada ponto, explicado.</h2>${p===null?(coop()?[0,1].map(teamBreakdown).join(''):'')+game.players.map((_,p)=>breakdown(p)).join(''):breakdown(p)}</div>`,'GRELHAS PÚBLICAS / PONTUAÇÃO');}
function showTeamScores(t){info(`<div class="score-content"><h2>A tua equipa, em detalhe.</h2>${teamBreakdown(t)}</div>`,'CO-OP / FRONTEIRA RAID 2');}
function showStandings(){
 const labels=coop()?['Equipa 1','Equipa 2']:game.players.map((_,p)=>name(p));
 info(`<div class="score-content"><h2>Corrida aos ${target(session)}.</h2><p class="score-detail">Só contam partidas completas. Quando a meta é atingida, ganha a maior pontuação acumulada. Empates dão vitória partilhada.</p><div class="standings-scroll"><table class="score-table"><thead><tr><th>Partida</th>${labels.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${session.results.map((row,i)=>`<tr><td>${i+1}</td>${row.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${labels.length+1}">Ainda não há partidas concluídas.</td></tr>`}</tbody><tfoot><tr><td>Total</td>${session.totals.map(v=>`<td>${v}</td>`).join('')}</tr></tfoot></table></div><p class="score-detail">Partida atual: ${session.rounds.length}${game.done?' · concluída':' · em curso, ainda não somada'}. Quem começa avança um lugar na ordem de jogo em cada nova partida.</p></div>`,'CLASSIFICAÇÃO DO CAMPEONATO');
}
function showRules(){info(`<div class="rules-content"><h2>Encontra o teu intervalo.</h2><p>Uma grelha de <b>3 × 4</b>, três cartas na mão e seis no mercado. Tens 12 turnos para somar o máximo de pontos.</p><ol><li><b>Entrega.</b> Escolhe uma carta da mão. Ela entra no mercado por ordem numérica.</li><li><b>Retira.</b> Escolhe a vizinha imediata à esquerda ou à direita da carta entregue. Numa extremidade há só uma escolha. A carta entregue fica no mercado.</li><li><b>Coloca.</b> Põe a carta retirada numa casa livre da tua grelha. Fica nesse lugar até ao fim. Repões a mão, exceto no 12.º turno.</li></ol><table class="score-table"><tbody>${tableRows(summaryRows)}</tbody></table><p>Os prémios <b>acumulam</b>. Uma linha 21–22–23–24 vale 3 + 8 = <b>11 pontos</b>, além de contactos e símbolos. Uma coluna 43–42–41 vale 1 + 4 = <b>5 pontos</b>.</p><p>As estrelas só combinam com estrelas. Não há diagonais nem ligação entre 90 e 1. Cada contacto ortogonal conta uma vez. A partida termina quando todas as grelhas estiverem cheias; os empates dão vitória partilhada.</p><p><b>Como controlar:</b> toca numa carta, numa vizinha e numa casa livre. Também podes arrastar a vizinha até à grelha. No modo de teste controlas todas as mãos; contra a máquina, só a tua mão é revelada.</p><p>A máquina usa uma estratégia local de pontuação e alinhamentos. Não vê outras mãos nem a ordem do monte. Não utiliza um serviço externo de IA.</p><h3>Corrida aos Pontos</h3><p>Joga partidas completas e soma os resultados. Metas: <b>2 jogadores: 45; 3: 50; 4 ou 5: 55 pontos</b>. A vitória só é verificada no fim da partida: vence a maior pontuação acumulada, mesmo que vários ultrapassem a meta. O primeiro jogador é sorteado na primeira partida e avança um lugar nas seguintes.</p><h3>CO-OP 2vs2 · RAID 2</h3><p>Equipa 1: 1A e 1B. Equipa 2: 2A e 2B. A ordem circular é <b>1A → 2B → 1B → 2A</b>. Cada equipa recebe bases A/B sorteadas e constrói duas grelhas independentes. No final, <b>A fica em cima e B em baixo</b>, sem rotação nem troca de colunas.</p><p>A linha inferior de A e a superior de B formam até três quadrados 2×2. Cada quadrado com quatro símbolos iguais vale <b>+4</b>; os quadrados podem sobrepor-se e as estrelas também são válidas. <b>Pelo menos um quadrado ativa todos os contactos verticais iguais da fronteira</b>: +1 por par normal, +2 por par de estrelas. Sem quadrado, esses contactos valem zero. Não há bónus numéricos que atravessem a união.</p><p>Somam-se as duas pontuações individuais e o RAID. Podes jogar uma partida única ou um campeonato até <b>100 pontos por equipa</b>. A aplicação não utiliza discos. O parceiro IA coordena-se apenas pelo estado público das grelhas; não partilha mãos nem conhece a ordem do monte.</p><p><a href="docs/regras.pdf" target="_blank" rel="noopener">Abrir livro ilustrado v0.5 · todos os modos ↗</a></p></div>`,'CLÁSSICO v0.3 / NOVOS MODOS v0.5');}
function showResults(){
 const points=championship()?session.totals:session.results.at(-1),w=sessionWinners(session),ranking=points.map((total,p)=>({p,total})).sort((a,b)=>b.total-a.total),label=p=>coop()?`Equipa ${p+1}`:name(p);
 const title=!session.finished?`Partida ${session.rounds.length} concluída.`:w.length>1?'Uma vitória partilhada.':coop()?`Equipa ${w[0]+1} venceu.`:w[0]===0&&mode==='ai'?'O intervalo foi teu.':`${name(w[0])} venceu.`;
 info(`<div class="score-content"><h2>${title}</h2><p class="score-detail">${championship()?`Meta: ${target(session)} pontos. ${session.finished?'Campeonato terminado.':'A corrida continua; ainda ninguém atingiu a meta.'}`:'Todas as sequências perfeitas já entraram na pontuação.'}${coop()?' As bases A e B estão agora unidas para pontuar RAID 2.':''}</p>${ranking.map(x=>`<div class="result-rank"><span>${label(x.p)}${session.finished&&w.includes(x.p)?' · vencedor':''}${championship()?`<small> +${session.results.at(-1)[x.p]} nesta partida</small>`:''}</span><b>${x.total}</b></div>`).join('')}<div class="save-actions">${!session.finished?'<button class="primary" data-next-round>Próxima partida →</button>':'<button class="primary" data-result-new>Jogar novamente →</button>'}<button class="outline" data-result-score>Ver os pontos</button>${coop()?'<button class="quiet" data-result-union>Ver união RAID 2 ↓</button>':''}${championship()?'<button class="quiet" data-result-standings>Classificação completa</button>':''}</div></div>`,'PARTIDA CONCLUÍDA');
}
function undo(){
 if(busy||driverActive||!history.length)return;
 generation++;sync(undoSession(session));offered=null;taken=null;save();render();toast(mode==='ai'?'Voltaste ao teu turno anterior.':'Último turno desfeito.');driveAI();
}
function exportGame(){
 if(!game)return;const b=new Blob([JSON.stringify(sessionRecord(session),null,2)],{type:'application/json'}),url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;a.download=`interval-${session.options.variant}-${session.options.seed}-partida-${session.rounds.length}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function saveMenu(){info(`<div class="rules-content"><h2>A tua mesa, guardada.</h2><p>A sessão inteira, incluindo as partidas anteriores e a classificação do campeonato, fica guardada automaticamente neste navegador. Para a continuar no iPad ou noutro computador, exporta o ficheiro e carrega-o no outro dispositivo.</p><div class="save-actions"><button class="primary" data-export>Exportar partida ↓</button><button class="outline" data-import>Carregar partida ↑</button></div><p>Modo: <b>${variantName()}</b> · partida ${session.rounds.length}.<br>Baralho da sessão: <b>${session.options.seed}</b> · ${game.turn} turnos nesta partida.<br>O mesmo código e número de jogadores reproduzem a mesma distribuição inicial.</p><p>iPad: abre a ligação no Safari. Em Partilhar, escolhe <b>Adicionar ao ecrã principal</b>. Depois da primeira abertura completa, o jogo também pode funcionar sem ligação.</p><p>A gravação é local: não sincroniza automaticamente entre dispositivos.</p></div>`,'GUARDAR / CONTINUAR');}
function setupMode(){const isCoop=$('#game-type').value==='coop';$('#player-count').disabled=isCoop;if(isCoop)$('#player-count').value='4';$('#coop-race-option').hidden=!isCoop;$('#game-description').textContent=isCoop?'Duas equipas, bases A/B sorteadas. O parceiro IA observa apenas as grelhas públicas.':$('#game-type').value==='race'?'Partidas completas até 45/50/55/55 pontos, conforme o número de jogadores.':'Uma partida de 12 turnos por jogador. Regras clássicas v0.3.';}
$('#game-type').addEventListener('change',setupMode);
$('#setup-form').addEventListener('submit',e=>{e.preventDefault();const seedText=$('#seed-input').value.trim(),seed=seedText?Number(seedText):crypto.getRandomValues(new Uint32Array(1))[0];if(!Number.isInteger(seed)||seed<0||seed>0xffffffff){$('#setup-error').textContent='Usa um número entre 0 e 4294967295.';return;}start(Number($('#player-count').value),seed,$('input[name="mode"]:checked').value,$('#game-type').value,$('#coop-race').checked);});
$('#resume-btn').onclick=()=>{try{resume(saved);}catch(e){toast(e.message);}};
$('#new-btn').onclick=setupDialog;$('#rules-btn').onclick=showRules;$('#scores-btn').onclick=()=>showScores();$('#undo-btn').onclick=undo;$('#save-menu-btn').onclick=saveMenu;
$('#cancel-btn').onclick=()=>{offered=null;taken=null;render();$('[data-hand="0"]')?.focus({preventScroll:true});};
document.addEventListener('click',e=>{
 const close=e.target.closest('[data-close]');if(close){close.closest('dialog').close();return;}
 const h=e.target.closest('[data-hand]');if(h&&!h.disabled){selectOffer(Number(h.dataset.hand));return;}
 const m=e.target.closest('[data-market]');if(m&&!m.disabled){takeNeighbor(Number(m.dataset.market));return;}
 const cell=e.target.closest('[data-cell]');if(cell&&!cell.disabled){place(Number(cell.dataset.cell));return;}
 const sc=e.target.closest('[data-score]');if(sc){showScores(Number(sc.dataset.score));return;}
 const team=e.target.closest('[data-team-score]');if(team){showTeamScores(Number(team.dataset.teamScore));return;}
 if(e.target.closest('[data-next-round]')){advance();return;}
 if(e.target.closest('[data-standings]')){showStandings();return;}
 if(e.target.closest('[data-export]'))exportGame();
 if(e.target.closest('[data-import]'))$('#import-file').click();
 if(e.target.closest('[data-result-new]')){$('#info-dialog').close();setupDialog();}
 if(e.target.closest('[data-result-score]')){$('#info-dialog').close();showScores();}
 if(e.target.closest('[data-result-standings]')){$('#info-dialog').close();showStandings();}
 if(e.target.closest('[data-result-union]')){$('#info-dialog').close();$('#boards').scrollIntoView({behavior:reduce.matches?'instant':'smooth',block:'start'});}
});
$('#import-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>2000000)throw Error('O ficheiro é demasiado grande.');const rec=JSON.parse(await file.text());restoreSession(rec);$('#info-dialog').close();resume(rec);toast('Sessão carregada.');}catch{toast('Não foi possível carregar este ficheiro de partida.');}});
$('#setup-dialog').addEventListener('cancel',e=>{if(!game)e.preventDefault();});
// Pointer events cover touch, Pencil and mouse. The normal tap sequence remains available.
let drag=null,suppressClick=false;
document.addEventListener('pointerdown',e=>{
 if(!canAct()||e.button!==0||offered===null)return;
 const el=e.target.closest('[data-market]');if(!el||!neighbors(game,offered).includes(Number(el.dataset.market)))return;
 drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,v:Number(el.dataset.market),from:rect(el),active:false,el};
});
document.addEventListener('pointermove',e=>{
 if(!drag||drag.pointer!==e.pointerId)return;
 if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>9){
  drag.active=true;taken=drag.v;render();drag.el=document.createElement('div');drag.el.className='flying-card drag-ghost';drag.el.innerHTML=cardHTML(game.market.find(c=>c.v===drag.v));drag.el.style.width=`${drag.from.width}px`;document.body.append(drag.el);
 }
 if(drag.active){e.preventDefault();Object.assign(drag.el.style,{left:`${e.clientX-drag.from.width/2}px`,top:`${e.clientY-drag.from.width/2}px`});$$('.drop-target').forEach(x=>x.classList.remove('drop-target'));const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell.available');hit?.classList.add('drop-target');}
},{passive:false});
document.addEventListener('pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;const d=drag;drag=null;if(!d.active)return;d.el.remove();$$('.drop-target').forEach(x=>x.classList.remove('drop-target'));const cell=document.elementFromPoint(e.clientX,e.clientY)?.closest('.cell.available');suppressClick=true;setTimeout(()=>suppressClick=false,0);if(cell)place(Number(cell.dataset.cell));else{render();announce('Escolhe uma casa livre para colocar a carta.');}});
document.addEventListener('pointercancel',()=>{if(drag?.active){drag.el.remove();render();}drag=null;});
document.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$$('dialog[open]').length&&offered!==null&&!busy&&!isAI()){offered=null;taken=null;render();}});
// Keep the initial table recognisable under the start dialog.
sync(createSession({n:2,seed:2026,mode:'ai',variant:'classic'}));render();game=null;session=null;setupMode();setupDialog();
if('serviceWorker'in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
