import {intervalScore} from './scoring.js';
export {intervalScore};
export const VERSION='0.4.0';
export const RULES='0.3';
export const FAMILIES=[3,3,0,2,2,3,0,2,0,2,2,3,3,1,2,2,2,1,2,0,2,1,0,1,1,3,4,2,1,3,2,3,0,1,0,0,1,2,0,3,1,0,1,1,1,1,1,3,1,4,1,3,1,4,1,1,0,2,1,4,3,0,3,0,2,3,4,4,3,0,2,3,0,2,2,0,0,0,4,0,3,3,3,3,2,4,4,2,0,4];
const copy=s=>JSON.parse(JSON.stringify(s));
function random(s){let t=s.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng>>>=0;return ((t^t>>>14)>>>0)/4294967296;}
export const current=s=>(s.first+s.turn)%s.n;
export const round=s=>Math.min(12,Math.floor(s.turn/s.n)+1);
const sort=(a,b)=>a.v-b.v;
export function setup(n=2,seed=1){
 if(!Number.isInteger(n)||n<2||n>5||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw Error('Preparação inválida.');
 const s={n,seed,rng:seed>>>0,turn:0,first:0,done:false,players:[],deck:[],market:[]};
 s.first=Math.floor(random(s)*n);
 s.deck=FAMILIES.map((k,i)=>({uid:i+1,v:i+1,k}));
 for(let i=89;i>0;i--){const j=Math.floor(random(s)*(i+1));[s.deck[i],s.deck[j]]=[s.deck[j],s.deck[i]];}
 s.market=s.deck.splice(-6).sort(sort);
 s.players=Array.from({length:n},()=>({hand:s.deck.splice(-3),grid:Array(12).fill(null)}));
 return s;
}
export function neighbors(s,h){
 const c=s.players[current(s)].hand[h];if(!c)return [];
 const sorted=[...s.market,c].sort(sort),i=sorted.findIndex(x=>x.v===c.v);
 return [sorted[i-1],sorted[i+1]].filter(Boolean).map(x=>x.v);
}
export function move(old,m){
 if(old.done)throw Error('A partida terminou.');
 const p=current(old),a=old.players[p];
 if(!Number.isInteger(m.h)||!a.hand[m.h]||!neighbors(old,m.h).includes(m.v))throw Error('Escolhe uma vizinha imediata.');
 if(!Number.isInteger(m.cell)||m.cell<0||m.cell>11||a.grid[m.cell])throw Error('Escolhe uma casa livre.');
 const s=copy(old),b=s.players[p],offered=b.hand.splice(m.h,1)[0],taken=s.market.find(c=>c.v===m.v);
 s.market=s.market.filter(c=>c.v!==m.v).concat(offered).sort(sort);b.grid[m.cell]=taken;
 if(round(s)<12)b.hand.push(s.deck.pop());
 s.turn++;s.done=s.turn===s.n*12;
 return s;
}
export function legalMoves(s){
 if(s.done)return [];
 const a=s.players[current(s)],out=[];
 a.hand.forEach((_,h)=>{for(const v of neighbors(s,h))a.grid.forEach((c,cell)=>{if(!c)out.push({h,v,cell});});});
 return out;
}
// Imperfect-information heuristic: receives only the current hand and public cards.
// It never reads deck order or another player's hand.
export function chooseMove(s){
 if(s.done)return null;
 const p=current(s),a=s.players[p];
 const unavailable=new Set(s.players.flatMap(x=>x.grid.filter(Boolean).map(c=>c.v)));
 function potential(grid){
  let value=intervalScore(grid,3,true).total;
  const lines=[...Array.from({length:3},(_,r)=>({ids:[0,1,2,3].map(c=>r*4+c),dir:1,order:3,symbol:3,perfect:8})),...Array.from({length:4},(_,c)=>({ids:[c,c+4,c+8],dir:-1,order:1,symbol:2,perfect:4}))];
  for(const l of lines){
   const known=l.ids.map((id,j)=>({c:grid[id],j})).filter(x=>x.c);
   if(!known.length||known.length===l.ids.length)continue;
   const progress=known.length/l.ids.length;
   const orderPossible=known.every((x,i)=>!i||l.dir*(x.c.v-known[i-1].c.v)>=x.j-known[i-1].j);
   const edgePossible=known.every(x=>l.dir===1?x.c.v>=x.j+1&&x.c.v<=90-(l.ids.length-1-x.j):x.c.v<=90-x.j&&x.c.v>=l.ids.length-x.j);
   if(orderPossible&&edgePossible)value+=l.order*progress*.85;
   if(known.every(x=>x.c.k===known[0].c.k))value+=l.symbol*progress*.75;
   const base=known[0].c.v-l.dir*known[0].j;
   const perfectPossible=known.every(x=>x.c.v===base+l.dir*x.j)&&l.ids.every((id,j)=>{const v=base+l.dir*j;return v>=1&&v<=90&&(grid[id]||!unavailable.has(v));});
   if(perfectPossible)value+=l.perfect*Math.pow(progress,2)*.48;
  }
  // Reward adjacent partial ordering, and spread first cards into useful positions.
  grid.forEach((c,i)=>{if(!c)return;if(i%4<3&&grid[i+1]&&c.v<grid[i+1].v)value+=.09;if(i<8&&grid[i+4]&&c.v>grid[i+4].v)value+=.04;});
  return value;
 }
 let best=null,bestValue=-Infinity;
 for(const m of legalMoves(s)){
  const grid=a.grid.slice();grid[m.cell]=s.market.find(c=>c.v===m.v);
  const v=potential(grid)+((m.v*13+m.cell*7+s.turn*3)%37)*.00001;
  if(v>bestValue){best=m;bestValue=v;}
 }
 return best;
}
export function serialize(seed,n,mode,moves){return {schema:1,appVersion:VERSION,rules:RULES,seed,n,mode,moves};}
export function restore(record){
 if(record?.schema!==1||record.rules!==RULES||!['manual','ai'].includes(record.mode)||!Array.isArray(record.moves)||record.moves.length>60)throw Error('Ficheiro de partida inválido.');
 let s=setup(record.n,record.seed);
 for(const m of record.moves)s=move(s,m);
 return s;
}
