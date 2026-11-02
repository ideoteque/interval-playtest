import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {current,move,legalMoves,intervalScore,serialize,setup} from '../engine.js';
import {coopScore,createSession,sessionMove,nextRound,sessionRecord,restoreSession,teamResult,target,sessionWinners,chooseSessionMove,undoSession} from '../session.js';
const empty=()=>Array(12).fill(null);
const card=(k,v)=>({k,v,uid:v});
function borders(a,b){const top=empty(),bottom=empty();a.forEach((k,i)=>top[8+i]=k===null?null:card(k,i+1));b.forEach((k,i)=>bottom[i]=k===null?null:card(k,50+i));return [top,bottom];}
const session=(variant='classic',n=2,seed=2026,championship=false,mode='manual')=>createSession({variant,n,seed,championship,mode});
function finish(s){while(!s.game.done)s=sessionMove(s,chooseSessionMove(s));return s;}
test('RAID: zero pontos sem qualquer quadrado, mesmo com contactos',()=>{
 const s=coopScore(...borders([0,1,2,3],[0,1,2,3]));assert.equal(s.contacts.length,4);assert.equal(s.activated,false);assert.equal(s.total,0);
});
test('RAID: um quadrado ativa todos os contactos, incluindo fora do quadrado',()=>{
 const s=coopScore(...borders([0,0,1,2],[0,0,1,3]));assert.equal(s.squares.length,1);assert.equal(s.squarePoints,4);assert.equal(s.contactPoints,3);assert.equal(s.total,7);
});
test('RAID: dois quadrados sobrepostos e três contactos reproduzem os 11 pontos da especificação',()=>{
 const s=coopScore(...borders([0,0,0,1],[0,0,0,2]));assert.deepEqual(s.squares.map(x=>x.column),[0,1]);assert.equal(s.total,11);
});
test('RAID: três quadrados normais somam 12 e quatro contactos somam 4',()=>{
 const s=coopScore(...borders([2,2,2,2],[2,2,2,2]));assert.equal(s.squarePoints,12);assert.equal(s.contactPoints,4);assert.equal(s.total,16);
});
test('RAID: estrelas não multiplicam quadrados; máximo de 20 pontos cooperativos',()=>{
 const s=coopScore(...borders([4,4,4,4],[4,4,4,4]));assert.equal(s.squarePoints,12);assert.equal(s.contactPoints,8);assert.equal(s.total,20);
});
test('RAID: quadrado incompleto ou misto não ativa os contactos',()=>{
 assert.equal(coopScore(...borders([0,0,null,null],[0,null,null,null])).total,0);
 assert.equal(coopScore(...borders([0,1,null,null],[0,1,null,null])).squares.length,0);
 assert.throws(()=>coopScore([],[]));
});
test('RAID: apenas linha inferior A com linha superior B; números não acrescentam bónus',()=>{
 const [a,b]=borders([0,0,0,0],[0,0,0,0]);assert.equal(coopScore(a,b).total,16);assert.equal(coopScore(b,a).total,0);
 b.slice(0,4).forEach((c,i)=>c.v=90-i);assert.equal(coopScore(a,b).total,16);
});
test('CO-OP: quatro jogadores, equipas alternadas e ordem circular 1A–2B–1B–2A',()=>{
 const expected=['1A','2B','1B','2A'];const assigned=new Set();
 for(let seed=0;seed<30;seed++){
  const s=session('coop',4,seed);assert.deepEqual(s.game.order.map(p=>`${s.roles[p].team+1}${s.roles[p].board}`),expected);
  assert.deepEqual(Array.from({length:8},(_,turn)=>{const r=s.roles[current({...s.game,turn})];return `${r.team+1}${r.board}`;}),Array.from({length:8},(_,turn)=>expected[(s.first+turn)%4]));
  assert.deepEqual([0,1].map(t=>s.roles.filter(r=>r.team===t).map(r=>r.board).sort()),[['A','B'],['A','B']]);
  assigned.add(s.roles[0].board);
  const observed=Array.from({length:8},(_,turn)=>s.roles[current({...s.game,turn})].team);observed.forEach((t,i)=>{if(i)assert.notEqual(t,observed[i-1]);});
 }
 assert.equal(assigned.size,2);assert.throws(()=>session('coop',3));
});

test('CO-OP corrigido roda quem começa no ciclo cruzado entre partidas',()=>{
 const s=finish(session('coop',4,23,true)),next=nextRound(s);
 assert.equal(next.options.coopOrder,'crossed');
 assert.equal(next.game.first,(s.first+1)%4);
 assert.deepEqual(next.game.order,s.game.order);
 assert.deepEqual(restoreSession(sessionRecord(next)),next);
});

test('CO-OP anterior à correção recupera as cartas e os lugares originais',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./legacy-coop.json',import.meta.url),'utf8'));
 const restored=restoreSession(fixture.record);
 assert.deepEqual(restored.game,fixture.game);
 assert.equal(restored.options.coopOrder,'legacy');
 assert.deepEqual(restoreSession(sessionRecord(restored)),restored);
 assert.equal(createSession({...fixture.record.options}).options.coopOrder,'crossed');
});
test('Clássico mantém pontuação e identidade do estado original',()=>{
 let s=session(),g=setup(2,2026);assert.deepEqual(s.game,g);
 while(!s.game.done){const m=legalMoves(g)[0];s=sessionMove(s,m);g=move(g,m);assert.deepEqual(s.game,g);}
 assert.equal(s.finished,true);assert.deepEqual(s.totals,g.players.map(p=>intervalScore(p.grid,3,true).total));assert.throws(()=>nextRound(s));
});
test('Corrida: metas exatas por número de jogadores',()=>{for(const [n,goal]of [[2,45],[3,50],[4,55],[5,55]]){const s=session('race',n);assert.equal(target(s),goal);assert.equal(s.options.championship,true);}assert.equal(target(session('coop',4,1,true)),100);});
test('Corrida: só acumula e verifica vitória no fim da partida',()=>{
 let s=session('race');s.totals=[44,0];for(let i=0;i<23;i++){s=sessionMove(s,legalMoves(s.game)[0]);assert.deepEqual(s.totals,[44,0]);assert.equal(s.finished,false);}s=sessionMove(s,legalMoves(s.game)[0]);assert.equal(s.results.length,1);assert(s.totals[0]>=44);
});
test('Corrida: empate acima da meta dá vitória partilhada',()=>{
 let s=session('race');while(s.game.turn<23)s=sessionMove(s,chooseSessionMove(s));const m=chooseSessionMove(s),g=move(s.game,m),points=g.players.map(p=>intervalScore(p.grid,3,true).total),desired=45+Math.max(...points);
 s.totals=points.map(p=>desired-p);s=sessionMove(s,m);assert.equal(s.finished,true);assert.deepEqual(sessionWinners(s),[0,1]);
});
test('Corrida: maior acumulado vence quando vários passam a meta',()=>{
 let s=session('race');while(s.game.turn<23)s=sessionMove(s,chooseSessionMove(s));const m=chooseSessionMove(s),g=move(s.game,m),pts=g.players.map(p=>intervalScore(p.grid,3,true).total),goal=50+Math.max(...pts);
 s.totals=[goal-pts[0],goal+1-pts[1]];s=sessionMove(s,m);assert.deepEqual(sessionWinners(s),[1]);
});
test('Nova partida: baralha novamente, roda quem começa e preserva acumulados',()=>{
 let s=finish(session('race',2,9));if(s.finished){s={...s,finished:false};}const first=s.game.first,next=nextRound(s);assert.equal(next.game.first,(first+1)%2);assert.notEqual(next.game.seed,s.game.seed);assert.deepEqual(next.totals,s.totals);assert.equal(next.game.turn,0);assert.equal(next.game.players[0].grid.filter(Boolean).length,0);assert.throws(()=>nextRound(next));
});
test('CO-OP: junta A/B corretamente e soma as duas grelhas mais RAID',()=>{
 const s=finish(session('coop',4,2026));assert.equal(s.game.turn,48);assert.equal(s.finished,true);
 for(let t=0;t<2;t++){const r=teamResult(s,t);assert.equal(s.roles[r.a].board,'A');assert.equal(s.roles[r.b].board,'B');assert.equal(r.total,r.individual[0]+r.individual[1]+r.coop.total);assert.equal(s.totals[t],r.total);}
});
test('CO-OP campeonato: só termina aos 100 e conserva papéis A/B entre partidas',()=>{
 let s=session('coop',4,71,true),rounds=0;
 while(!s.finished){s=finish(s);rounds++;assert.equal(s.results.length,rounds);if(!s.finished){assert(s.totals.every(x=>x<100));const roles=s.roles;s=nextRound(s);assert.deepEqual(s.roles,roles);}assert(rounds<20);}
 assert(s.totals.some(x=>x>=100));assert.equal(s.game.done,true);assert.throws(()=>nextRound(s));
});
test('Campeonatos guardados recuperam classificação e partida em curso',()=>{
 let s=finish(session('race',2,19));if(!s.finished){s=nextRound(s);s=sessionMove(s,chooseSessionMove(s));}
 assert.deepEqual(restoreSession(JSON.parse(JSON.stringify(sessionRecord(s)))),s);
 const c=finish(session('coop',4,5,true));assert.deepEqual(restoreSession(sessionRecord(c)),c);
});
test('Gravações v0.4 continuam a abrir no Clássico',()=>{
 let g=setup(2,17),moves=[];for(let i=0;i<6;i++){const m=legalMoves(g)[0];moves.push(m);g=move(g,m);}const s=restoreSession(serialize(17,2,'manual',moves));assert.equal(s.options.variant,'classic');assert.deepEqual(s.game,g);
});
test('Rejeita históricos inválidos e partidas extra após o fim',()=>{
 assert.throws(()=>restoreSession({schema:2,rules:'0.5',options:session().options,rounds:[]}));
 const rec=sessionRecord(session('race'));rec.rounds.push({moves:[]});assert.throws(()=>restoreSession(rec));
 const done=sessionRecord(finish(session()));done.rounds.push({moves:[]});assert.throws(()=>restoreSession(done));
});
test('Desfazer retira o resultado final do acumulado e mantém partidas anteriores',()=>{
 const s=finish(session('race',2,2026)),u=undoSession(s);assert.equal(u.game.done,false);assert.equal(u.game.turn,23);assert.deepEqual(u.totals,[0,0]);assert.equal(u.results.length,0);assert.deepEqual(restoreSession(sessionRecord(u)),u);
});
test('IA cooperativa respeita cartas ocultas, incluindo a mão do parceiro',()=>{
 let s=session('coop',4,81,false,'ai');for(let turn=0;turn<20;turn++){
  const p=current(s.game),m=chooseSessionMove(s),other=structuredClone(s);other.game.deck.reverse();other.game.players.forEach((x,i)=>{if(i!==p)x.hand=[card(4,99),card(1,98),card(2,97)];});
  assert.deepEqual(chooseSessionMove(other),m);assert(legalMoves(s.game).some(x=>JSON.stringify(x)===JSON.stringify(m)));s=sessionMove(s,m);
 }
});
