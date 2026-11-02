import {setup,move,current,intervalScore,chooseMove,VERSION} from './engine.js';
export const RACE_TARGETS={2:45,3:50,4:55,5:55};
export function coopScore(top,bottom){
 if(!Array.isArray(top)||!Array.isArray(bottom)||top.length!==12||bottom.length!==12)throw Error('São necessárias duas grelhas 3×4.');
 const squares=[],contacts=[];
 for(let c=0;c<3;c++){
  const cards=[top[8+c],top[9+c],bottom[c],bottom[c+1]];
  if(cards.every(Boolean)&&cards.every(x=>x.k===cards[0].k))squares.push({column:c,family:cards[0].k,points:4,values:cards.map(x=>x.v)});
 }
 for(let c=0;c<4;c++)if(top[8+c]&&bottom[c]&&top[8+c].k===bottom[c].k)contacts.push({column:c,values:[top[8+c].v,bottom[c].v],points:top[8+c].k===4?2:1});
 const activated=squares.length>0,squarePoints=squares.length*4,contactPoints=activated?contacts.reduce((n,x)=>n+x.points,0):0;
 return {activated,squares,contacts,squarePoints,contactPoints,total:squarePoints+contactPoints};
}
function normalize(options){
 const {seed,n,mode,variant='classic'}=options||{};
 if(!['manual','ai'].includes(mode)||!['classic','race','coop'].includes(variant)||!Number.isInteger(seed)||seed<0||seed>0xffffffff||!Number.isInteger(n)||n<2||n>5||variant==='coop'&&n!==4)throw Error('Opções de partida inválidas.');
 const coopOrder=options.coopOrder??'crossed';
 if(variant==='coop'&&!['crossed','legacy'].includes(coopOrder))throw Error('Ordem cooperativa inválida.');
 return {seed,n,mode,variant,championship:variant==='race'||variant==='coop'&&options.championship===true,...(variant==='coop'?{coopOrder}:{})};
}
function rolesFor(seed){
 let t=(seed^0x52414944)>>>0;const coin=()=>{let v=t+=0x6D2B79F5;v=Math.imul(v^v>>>15,v|1);v^=v+Math.imul(v^v>>>7,v|61);return (v^v>>>14)>>>31;};
 const first=coin(),second=coin();
 return [first,second,1-first,1-second].map((v,p)=>({team:p%2,board:v?'B':'A'}));
}
function gameFor(options,index,first,roles){
 const seed=(options.seed+Math.imul(index,0x9e3779b9))>>>0,s=setup(options.n,seed);
 if(index)s.first=(first+index)%s.n;
 if(options.variant==='coop'){
  const order=options.coopOrder==='legacy'?[[0,'A'],[1,'A'],[0,'B'],[1,'B']]:[[0,'A'],[1,'B'],[0,'B'],[1,'A']];
  s.order=order.map(([team,board])=>roles.findIndex(x=>x.team===team&&x.board===board));
 }
 return s;
}
export function createSession(options){
 const opts=normalize(options),roles=opts.variant==='coop'?rolesFor(opts.seed):null;
 const game=gameFor(opts,0,null,roles);
 return {options:opts,roles,first:game.first,rounds:[{moves:[]}],results:[],totals:Array(opts.variant==='coop'?2:opts.n).fill(0),game,finished:false};
}
export function target(session){return session.options.variant==='coop'?100:RACE_TARGETS[session.options.n];}
export function teamResult(session,team,game=session.game){
 if(session.options.variant!=='coop')throw Error('A partida não é cooperativa.');
 const a=session.roles.findIndex(x=>x.team===team&&x.board==='A'),b=session.roles.findIndex(x=>x.team===team&&x.board==='B');
 const coop=coopScore(game.players[a].grid,game.players[b].grid);
 const individual=[a,b].map(p=>intervalScore(game.players[p].grid,3,game.done).total);
 return {team,a,b,coop,individual,total:individual[0]+individual[1]+(game.done?coop.total:0),potential:individual[0]+individual[1]+coop.total};
}
export function sessionMove(old,m){
 if(old.finished)throw Error('A sessão terminou.');
 const game=move(old.game,m),rounds=old.rounds.map((r,i)=>i===old.rounds.length-1?{moves:[...r.moves,{h:m.h,v:m.v,cell:m.cell}]}:r);
 const s={...old,game,rounds};
 if(game.done){
  const points=s.options.variant==='coop'?[0,1].map(t=>teamResult(s,t).total):game.players.map(p=>intervalScore(p.grid,3,true).total);
  s.results=[...old.results,points];s.totals=old.totals.map((v,i)=>v+points[i]);
  s.finished=!s.options.championship||s.totals.some(v=>v>=target(s));
 }
 return s;
}
export function nextRound(s){
 if(!s.game.done||s.finished)throw Error('Não há outra partida disponível neste campeonato.');
 if(s.rounds.length>=256)throw Error('Foi atingido o limite de 256 partidas guardadas.');
 return {...s,game:gameFor(s.options,s.rounds.length,s.first,s.roles),rounds:[...s.rounds,{moves:[]}]};
}
export function sessionRecord(s){return {schema:2,appVersion:VERSION,rules:'0.5',options:s.options,rounds:s.rounds};}
export function restoreSession(record){
 if(record?.schema===1&&record.rules==='0.3')record={schema:2,rules:'0.5',options:{seed:record.seed,n:record.n,mode:record.mode,variant:'classic'},rounds:[{moves:record.moves}]};
 if(record?.schema!==2||record.rules!=='0.5'||!Array.isArray(record.rounds)||!record.rounds.length||record.rounds.length>256)throw Error('Ficheiro de sessão inválido.');
 const options=record.options?.variant==='coop'&&!record.options.coopOrder?{...record.options,coopOrder:'legacy'}:record.options;
 let s=createSession(options);
 for(let i=0;i<record.rounds.length;i++){
  if(i)s=nextRound(s);
  const moves=record.rounds[i]?.moves;
  if(!Array.isArray(moves)||moves.length>s.options.n*12)throw Error('Histórico de jogadas inválido.');
  for(const m of moves){if(!m||typeof m!=='object')throw Error('Jogada inválida.');s=sessionMove(s,m);}
 }
 return s;
}
export function sessionWinners(s){
 if(!s.game.done)return [];
 const points=s.options.championship?s.totals:s.results.at(-1),max=Math.max(...points);
 return points.map((v,i)=>v===max?i:-1).filter(i=>i>=0);
}
export function chooseSessionMove(s){
 if(s.options.variant!=='coop')return chooseMove(s.game);
 const p=current(s.game),role=s.roles[p],partner=s.roles.findIndex((x,i)=>i!==p&&x.team===role.team);
 return chooseMove(s.game,{board:role.board,partnerGrid:s.game.players[partner].grid});
}
export function undoSession(old){
 const record=structuredClone(sessionRecord(old)),moves=record.rounds.at(-1).moves;
 if(!moves.length)return old;
 moves.pop();let s=restoreSession(record);
 if(s.options.mode==='ai')while(moves.length&&current(s.game)!==0){moves.pop();s=restoreSession(record);}
 return s;
}
