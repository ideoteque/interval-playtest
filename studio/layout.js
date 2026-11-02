export const VERSION='1.0.0';
export const MM=72/25.4;
export const DEFAULTS={box:'balanced',margin:3,bleed:3,sourceBleed:3,marks:true,folds:true,side:'both',duplex:'long',dx:0,dy:0,dpi:300,fit:'cover'};
export const SIZE={fronts:[50.8,50.8],backs:[50.8,50.8],market:[480,90],boards:[240,190]};
export function checkedSettings(input={}){
 const s={...DEFAULTS,...input};
 for(const [key,min,max]of [['margin',3,20],['bleed',0,6],['sourceBleed',0,10],['dx',-10,10],['dy',-10,10]])if(!Number.isFinite(s[key])||s[key]<min||s[key]>max)throw Error(`Valor inválido: ${key}.`);
 if(!['balanced','flat'].includes(s.box)||!['front','back','both'].includes(s.side)||!['long','short'].includes(s.duplex)||!['cover','contain'].includes(s.fit)||![150,300,600].includes(s.dpi))throw Error('Configuração de impressão inválida.');
 return s;
}
export function expand(group){return (group?.assets||[]).flatMap(a=>{const n=a.quantity??1;if(!Number.isInteger(n)||n<1||n>90)throw Error('A quantidade deve estar entre 1 e 90.');return Array.from({length:n},()=>a);});}
export function fitGrid(w,h,s,orientation){
 const [W,H]=orientation==='landscape'?[297,210]:[210,297],extra=s.marks?2.5:0;
 const pw=w+2*s.bleed,ph=h+2*s.bleed;
 const cols=Math.max(0,Math.floor((W-2*(s.margin+extra)+1e-8)/pw)),rows=Math.max(0,Math.floor((H-2*(s.margin+extra)+1e-8)/ph));
 return {W,H,w,h,cols,rows,capacity:cols*rows,pw,ph,startX:(W-cols*pw)/2+s.bleed,startY:(H-rows*ph)/2+s.bleed,orientation};
}
export function mirror(p,W,H,s){return {...p,x:(s.duplex==='long'?W-p.x-p.w:p.x)+s.dx,y:(s.duplex==='short'?H-p.y-p.h:p.y)+s.dy};}
export function cropMarks(places,s){
 if(!s.marks||!places.length)return [];
 const b=s.bleed,gap=.5,len=2;
 const left=Math.min(...places.map(p=>p.x))-b,right=Math.max(...places.map(p=>p.x+p.w))+b,top=Math.min(...places.map(p=>p.y))-b,bottom=Math.max(...places.map(p=>p.y+p.h))+b;
 const xs=[...new Set(places.flatMap(p=>[p.x,p.x+p.w]))],ys=[...new Set(places.flatMap(p=>[p.y,p.y+p.h]))];
 return [...xs.flatMap(x=>[[x,top-gap-len,x,top-gap],[x,bottom+gap,x,bottom+gap+len]]),...ys.flatMap(y=>[[left-gap-len,y,left-gap,y],[right+gap,y,right+gap+len,y]])].map(a=>({a:a.slice(0,2),b:a.slice(2),type:'cut'}));
}
export function foldMarks(places,s){
 if(!s.folds)return [];
 const result=[];
 for(const p of places){
  let folds=p.group==='boards'&&s.box==='balanced'?[120]:p.group==='market'?(s.box==='balanced'?[120,240,360]:[240]):[];
  const cropX=p.crop?.x||0;
  for(const f of folds)if(f>cropX+.01&&f<cropX+p.w-.01){
   const x=p.x+f-cropX,b=s.bleed;
   result.push({a:[x,p.y-b-2.5],b:[x,p.y-b-.5],type:'fold'},{a:[x,p.y+p.h+b+.5],b:[x,p.y+p.h+b+2.5],type:'fold'});
  }
 }
 return result;
}
function makePage(grid,placements,s,label,side='front'){
 const guides=[...cropMarks(placements,s),...foldMarks(placements,s)];
 const all=placements.flatMap(p=>[[p.x-s.bleed,p.y-s.bleed],[p.x+p.w+s.bleed,p.y+p.h+s.bleed]]).concat(guides.flatMap(g=>[g.a,g.b]));
 const out=all.some(([x,y])=>x<s.margin-1e-6||y<s.margin-1e-6||x>grid.W-s.margin+1e-6||y>grid.H-s.margin+1e-6);
 return {W:grid.W,H:grid.H,orientation:grid.orientation,placements,guides,label,side,outside:out};
}
export function plan(project,component){
 const s=checkedSettings(project.settings),groups=project.groups,errors=[],warnings=[];
 let pages=[],frontSheets=0,capacity=0;
 if(component==='cards'){
  const fronts=expand(groups.fronts),backs=expand(groups.backs),portrait=fitGrid(50.8,50.8,s,'portrait'),landscape=fitGrid(50.8,50.8,s,'landscape');
  const grid=portrait.capacity>=landscape.capacity?portrait:landscape;capacity=grid.capacity;
  if(!fronts.length)errors.push('Carrega as frentes das cartas ou usa a arte INTERVAL.');
  if((s.side==='back'||s.side==='both')&&backs.length!==1&&backs.length!==fronts.length)errors.push('Usa um verso comum ou exatamente um verso por carta.');
  if(!capacity)errors.push('As cartas não cabem em A4 com estas margens e sangria.');
  if(!errors.length){
   frontSheets=Math.ceil(fronts.length/capacity);
   for(let i=0;i<frontSheets;i++){
    const placements=fronts.slice(i*capacity,(i+1)*capacity).map((a,j)=>({assetId:a.id,group:'fronts',index:i*capacity+j,x:grid.startX+(j%grid.cols)*grid.pw,y:grid.startY+Math.floor(j/grid.cols)*grid.ph,w:50.8,h:50.8}));
    if(s.side!=='back')pages.push(makePage(grid,placements,s,`Cartas · folha ${i+1} · frente`));
    if(s.side!=='front'){
     const reverse=placements.map(p=>mirror({...p,assetId:backs.length===1?backs[0].id:backs[p.index].id,group:'backs'},grid.W,grid.H,s));
     pages.push(makePage(grid,reverse,s,`Cartas · folha ${i+1} · verso`,'back'));
    }
   }
  }
  if(fronts.length&&fronts.length!==90)warnings.push(`Este projeto tem ${fronts.length} cartas. O baralho principal tem 90.`);
 }else if(component==='market'||component==='boards'){
  const assets=expand(groups[component]),isMarket=component==='market';
  const grid=fitGrid(240,isMarket?90:190,s,'landscape');capacity=grid.capacity;
  if(!assets.length)errors.push(`Carrega a arte ${isMarket?'do mercado':'das bases'}.`);
  if(!capacity||isMarket&&capacity<2)errors.push(isMarket?'As duas metades não cabem numa A4. Reduz a margem ou a sangria.':'Uma base de 240 × 190 mm não cabe com estas margens e miras. Reduz a margem ou a sangria.');
  if(!errors.length)for(const a of assets){
   const tiles=isMarket?[0,240]:[0];
   const placements=tiles.map((x,j)=>({assetId:a.id,group:component,x:grid.startX,y:grid.startY+j*grid.ph,w:240,h:isMarket?90:190,crop:isMarket?{x,y:0,w:240,h:90}:null,tile:isMarket?j+1:null}));
   pages.push(makePage(grid,placements,s,`${isMarket?'Mercado':a.name} · ${pages.length+1}`));
  }
  frontSheets=pages.length;
 }
 if(pages.some(p=>p.outside))errors.push('A correção do verso ou as guias ultrapassam a área imprimível. Ajusta a calibração ou aumenta as margens.');
 return {pages,errors,warnings,capacity,sheets:frontSheets,faces:pages.length,settings:s};
}
export function emptyProject(){return {schema:1,name:'INTERVAL · Prova caseira',settings:{...DEFAULTS},files:{},groups:Object.fromEntries(['fronts','backs','market','boards'].map(k=>[k,{mode:k==='fronts'?'bleed':'trim',assets:[]}]))};}
export function validateProject(p){
 if(!p||p.schema!==1||typeof p.name!=='string'||!p.files||!p.groups)throw Error('Projeto Print Studio inválido.');
 checkedSettings(p.settings);
 const ids=new Set();let count=0;
 for(const key of ['fronts','backs','market','boards']){
  const g=p.groups[key];if(!g||!['trim','bleed'].includes(g.mode)||!Array.isArray(g.assets))throw Error('Componente inválido.');
  for(const a of g.assets){if(!a||typeof a.id!=='string'||ids.has(a.id)||typeof a.name!=='string'||!p.files[a.fileId]||!Number.isInteger(a.page)||a.page<1)throw Error('Arte inválida.');ids.add(a.id);count++;}
  if(expand(g).length>200)throw Error('O limite é de 200 peças por componente.');
 }
 if(count>300)throw Error('O limite é de 300 elementos por projeto.');
 for(const f of Object.values(p.files))if(!f||!['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'].includes(f.mime)||typeof f.data!=='string'||!f.data.startsWith(`data:${f.mime};base64,`)||f.data.length>115000000)throw Error('Ficheiro de arte inválido.');
 return p;
}
