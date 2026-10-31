import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup,move,neighbors,current,round,FAMILIES,intervalScore,chooseMove,serialize,restore,legalMoves} from '../engine.js';
const c=v=>({v,k:FAMILIES[v-1],uid:v});
function invariant(s){
 const cards=[...s.deck,...s.market,...s.players.flatMap(p=>[...p.hand,...p.grid.filter(Boolean)])];
 assert.equal(cards.length,90);assert.equal(new Set(cards.map(c=>c.v)).size,90);
 assert.equal(s.market.length,6);assert.deepEqual(s.market.map(x=>x.v),s.market.map(x=>x.v).sort((a,b)=>a-b));
 cards.forEach(x=>assert.equal(x.k,FAMILIES[x.v-1]));
}
test('90 identidades e distribuição de famílias pré-fechadas',()=>{
 assert.equal(FAMILIES.length,90);assert.deepEqual([0,1,2,3,4].map(k=>FAMILIES.filter(x=>x===k).length),[20,20,20,20,10]);
 for(let n=2;n<=5;n++)for(const seed of [0,1,2026,4294967295])invariant(setup(n,seed));
});
test('Mesma preparação que a v0.3 original, com sorteio inicial e baralho deterministas',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./v03-fixtures.json',import.meta.url)));
 for(const f of fixtures){const s=setup(f.n,f.seed);assert.equal(s.first,f.first);assert.deepEqual(s.market,f.market);assert.deepEqual(s.deck,f.deck);assert.deepEqual(s.players,f.players);}
});
test('Só permite vizinhas imediatas; extremos dão uma só escolha',()=>{
 const s=setup();s.first=0;s.market=[10,20,30,40,50,60].map(c);s.players[0].hand=[1,25,90].map(c);
 assert.deepEqual(neighbors(s,0),[10]);assert.deepEqual(neighbors(s,1),[20,30]);assert.deepEqual(neighbors(s,2),[60]);
 assert.throws(()=>move(s,{h:1,v:25,cell:0}));assert.throws(()=>move(s,{h:1,v:40,cell:0}));
 const next=move(s,{h:1,v:20,cell:0});assert.equal(s.players[0].grid[0],null);assert.equal(next.players[0].grid[0].v,20);
 assert.equal(next.market.some(x=>x.v===25),true);
});
test('Contactos verticais contam, estrelas valem dois e não são universais',()=>{
 const g=Array(12).fill(null);g[0]={v:1,k:4};g[4]={v:2,k:4};g[8]={v:3,k:4};g[1]={v:4,k:0};
 const s=intervalScore(g,3,true);assert.equal(s.verticalPoints,4);assert.equal(s.horizontalPoints,0);assert.equal(s.symbolCols,2);
});
test('Exemplo do livro de regras: 24 pontos com contacto 52–30 e 30–40',()=>{
 const s=intervalScore([21,22,23,24,20,52,68,84,19,30,40,50].map(c),3,true);
 assert.deepEqual([s.contacts,s.rows,s.descendingCols,s.symbolRows,s.symbolCols,s.finalBonus,s.total],[2,9,1,0,0,12,24]);
 assert.equal(intervalScore([21,22,23,24,20,52,68,84,19,30,40,50].map(c),3,false).total,12);
});
test('Sequências verticais são decrescentes; não pontua a direção inversa',()=>{
 const g=Array(12).fill(null);[g[0],g[4],g[8]]=[43,42,41].map(c);assert.equal(intervalScore(g,3).perfectCols,4);
 [g[0],g[4],g[8]]=[41,42,43].map(c);assert.equal(intervalScore(g,3).perfectCols,0);
});
test('12 turnos por jogador, conservação das 90 cartas e mão final de 2',()=>{
 for(let n=2;n<=5;n++)for(let seed=0;seed<15;seed++){
  let s=setup(n,seed);while(!s.done){const moves=legalMoves(s);const m=moves[(seed+s.turn*7)%moves.length];s=move(s,m);invariant(s);}
  assert.equal(s.turn,n*12);s.players.forEach(p=>{assert.equal(p.grid.filter(Boolean).length,12);assert.equal(p.hand.length,2);});assert.throws(()=>move(s,{h:0,v:1,cell:0}));
 }
});
test('AI dá jogadas legais e não depende de cartas escondidas',()=>{
 let s=setup(2,51);
 for(let i=0;i<24;i++){
  const m=chooseMove(s),other=structuredClone(s);other.deck.reverse();other.players[1-current(s)].hand.reverse();
  assert.deepEqual(chooseMove(other),m);assert(legalMoves(s).some(x=>JSON.stringify(x)===JSON.stringify(m)));s=move(s,m);
 }
 assert.equal(s.done,true);assert.equal(chooseMove(s),null);
});
test('Guardar e carregar reproduz a partida e rejeita movimentos inválidos',()=>{
 let s=setup(3,77);const moves=[];
 for(let i=0;i<12;i++){const m=legalMoves(s)[0];moves.push(m);s=move(s,m);}
 assert.deepEqual(restore(serialize(77,3,'manual',moves)),s);
 assert.throws(()=>restore(serialize(77,3,'manual',[{h:0,v:99,cell:0}])));
 assert.throws(()=>restore({...serialize(77,3,'manual',[]),n:6}));
 assert.throws(()=>restore({...serialize(77,3,'manual',[]),rules:'0.2'}));
});
