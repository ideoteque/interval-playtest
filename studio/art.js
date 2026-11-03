import {SIZE} from './layout.js';
import {FAMILIES} from '../engine.js';
const enc=new TextEncoder();
export function dataURL(bytes,mime){let str='';for(let i=0;i<bytes.length;i+=16384)str+=String.fromCharCode(...bytes.subarray(i,i+16384));return `data:${mime};base64,${btoa(str)}`;}
export function bytesOf(data){const str=atob(data.slice(data.indexOf(',')+1));return Uint8Array.from(str,c=>c.charCodeAt(0));}
export const svgData=text=>dataURL(enc.encode(text),'image/svg+xml');
export function sanitizeSVG(text){
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');
 if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('SVG inválido.');
 doc.querySelectorAll('script,foreignObject,iframe,object,embed,audio,video,animate,animateTransform,set').forEach(n=>n.remove());
 for(const el of doc.querySelectorAll('*'))for(const a of [...el.attributes]){
  const name=a.localName.toLowerCase(),value=a.value.trim();
  if(name.startsWith('on')||name==='href'&&!value.startsWith('#')&&!/^data:image\/(png|jpeg|webp|svg\+xml);base64,/i.test(value))el.removeAttributeNode(a);
  else if(/javascript:|expression\s*\(/i.test(value))el.removeAttributeNode(a);
 }
 const cleanCSS=s=>s.replace(/@import[^;]+;/gi,'').replace(/url\(([^)]+)\)/gi,(all,value)=>{const v=value.trim().replace(/^['"]|['"]$/g,'');return v.startsWith('#')||/^data:(image\/|font\/|application\/(x-font|font))/i.test(v)?all:'none';});
 for(const style of doc.querySelectorAll('style'))style.textContent=cleanCSS(style.textContent);
 for(const el of doc.querySelectorAll('[style]'))el.setAttribute('style',cleanCSS(el.getAttribute('style')));
 // Illustrator exports often use class-only fills. Inline simple presentation
 // rules as well, so imported SVG stays portable in image/PDF renderers.
 const presentation=new Set(['fill','fill-opacity','fill-rule','stroke','stroke-width','stroke-opacity','stroke-linejoin','stroke-linecap','stroke-miterlimit','opacity','font-family','font-size','font-weight','text-anchor','display','visibility','clip-rule']);
 for(const style of doc.querySelectorAll('style'))for(const match of style.textContent.matchAll(/([^{}]+)\{([^{}]+)\}/g)){
  const selector=match[1].trim();if(selector.startsWith('@'))continue;
  const rules=match[2].split(';').map(d=>{const i=d.indexOf(':');return [d.slice(0,i).trim(),d.slice(i+1).trim()];}).filter(([k,v])=>presentation.has(k)&&v&&!v.includes('!important'));
  try{for(const el of doc.querySelectorAll(selector))for(const [k,v]of rules)if(!el.style?.getPropertyValue(k))el.setAttribute(k,v);}catch{}
 }
 const root=doc.documentElement,vb=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
 if(vb.length===4&&vb.every(Number.isFinite)&&vb[2]>0&&vb[3]>0){root.setAttribute('width',String(vb[2]));root.setAttribute('height',String(vb[3]));}
 root.setAttribute('xmlns','http://www.w3.org/2000/svg');
 return new XMLSerializer().serializeToString(root);
}
export async function imageOf(url){const img=new Image();img.decoding='async';img.src=url;await new Promise((res,rej)=>{if(img.complete&&img.naturalWidth)res();else{img.onload=res;img.onerror=()=>rej(Error('Não foi possível ler esta imagem.'));}});return img;}
let pdfModule;
export async function pdfJS(){
 if(!pdfModule){pdfModule=await import('./vendor/pdf.mjs');pdfModule.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;}
 return pdfModule;
}
const pdfDocs=new Map();
async function pdfDoc(file,id){
 if(!pdfDocs.has(id)){const mod=await pdfJS();pdfDocs.set(id,mod.getDocument({data:bytesOf(file.data),isEvalSupported:false,useWasm:false,useSystemFonts:true}).promise);}
 return pdfDocs.get(id);
}
export function clearArtCache(){for(const value of pdfDocs.values())value.then(p=>p.destroy()).catch(()=>{});pdfDocs.clear();renderCache.clear();}
export async function readFiles(files,project,group,onProgress=()=>{}){
 const result=[],additions={};
 const ordered=[...files].sort((a,b)=>a.name.localeCompare(b.name,'pt',{numeric:true}));
 if(ordered.reduce((n,f)=>n+f.size,0)>120000000)throw Error('Carrega até 120 MB de cada vez.');
 for(let i=0;i<ordered.length;i++){
  const f=ordered[i];onProgress(`A ler ${i+1}/${ordered.length}: ${f.name}`);
  if(f.size>80000000)throw Error('Cada ficheiro pode ter no máximo 80 MB.');
  const extension=f.name.split('.').pop().toLowerCase();
  const mime=({svg:'image/svg+xml',pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'})[extension];
  if(!mime)throw Error(`Formato não suportado: ${f.name}. Usa PNG, JPG, WebP, SVG ou PDF.`);
  const id=crypto.randomUUID();
  const data=mime==='image/svg+xml'?svgData(sanitizeSVG(await f.text())):dataURL(new Uint8Array(await f.arrayBuffer()),mime);
  const file={name:f.name,mime,data};additions[id]=file;
  let pages=1,dimensions;
  if(mime==='application/pdf')pages=(await pdfDoc(file,id)).numPages;
  else{const img=await imageOf(data);dimensions=[img.naturalWidth,img.naturalHeight];}
  if(result.length+pages+project.groups[group].assets.length>200)throw Error('O limite por componente é de 200 elementos.');
  for(let page=1;page<=pages;page++)result.push({id:crypto.randomUUID(),fileId:id,page,name:f.name+(pages>1?` · ${page}`:''),quantity:1,...(dimensions?{pixels:dimensions}:{})});
 }
 return {assets:result,files:additions};
}
export async function preset(){
 const names=['eye','record','severance','x-code','star'];
 const [font,...sources]=await Promise.all([fetch('../assets/Doto-Black.ttf').then(r=>r.arrayBuffer()).then(b=>dataURL(new Uint8Array(b),'font/ttf')),...names.map(n=>fetch(`../assets/${n}.svg`).then(r=>r.text()))]);
 const files={},groups=Object.fromEntries(['fronts','backs','market','boards'].map(k=>[k,{mode:k==='fronts'?'bleed':'trim',assets:[]}]))
 const fg=['#acd1c6','#ffbf00','#ec277b','#acd1c6','#604b94'];
 const inner=sources.map(s=>new DOMParser().parseFromString(sanitizeSVG(s),'image/svg+xml').documentElement.innerHTML);
 for(let v=1;v<=90;v++){
  const k=FAMILIES[v-1],id=`interval-card-${v}`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="161.007874" height="161.007874" viewBox="-8.503937 -8.503937 161.007874 161.007874"><style>@font-face{font-family:Doto;src:url('${font}') format('truetype');font-weight:900}</style>${inner[k]}<g font-family="Doto" font-weight="900" font-size="34.274" fill="${fg[k]}"><text x="11.34" y="35.16">${v}</text><text transform="translate(132.66 108.84) rotate(180)">${v}</text></g></svg>`;
  files[id]={name:`INTERVAL ${String(v).padStart(2,'0')}`,mime:'image/svg+xml',data:svgData(svg)};
  groups.fronts.assets.push({id,fileId:id,page:1,name:String(v),quantity:1});
 }
 const back=await fetch('../assets/back.png').then(r=>r.arrayBuffer());files.back={name:'Verso INTERVAL',mime:'image/png',data:dataURL(new Uint8Array(back),'image/png')};
 groups.backs.assets=[{id:'back',fileId:'back',page:1,name:'Verso comum',quantity:1}];
 for(const [id,group,quantity]of [['market','market',1],['motherboard-a','boards',3],['motherboard-b','boards',2]]){
  // The author's PNG exports preserve the exact outlined/display lettering of
  // the mats; user-supplied SVG remains supported without rasterizing its source.
  const source=await fetch(`../assets/${id}.png`).then(r=>{if(!r.ok)throw Error('Não foi possível carregar a arte original.');return r.arrayBuffer();});
  files[id]={name:id,mime:'image/png',data:dataURL(new Uint8Array(source),'image/png')};
  groups[group].assets.push({id,fileId:id,page:1,name:id==='market'?'RAM Market':id.endsWith('a')?'Base A':'Base B',quantity});
 }
 return {files,groups};
}
function canvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function fit(ctx,img,x,y,w,h,mode){
 const scale=(mode==='contain'?Math.min:Math.max)(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;
 ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);ctx.restore();
}
const renderCache=new Map();
export async function renderArt(project,assetId,group,dpi=300){
 const s=project.settings,key=[assetId,group,dpi,s.bleed,s.sourceBleed,s.fit,project.groups[group].mode].join('|');
 if(renderCache.has(key)){const r=renderCache.get(key);renderCache.delete(key);renderCache.set(key,r);return r;}
 const a=project.groups[group].assets.find(a=>a.id===assetId);if(!a)throw Error('A arte deste elemento já não está disponível.');
 const file=project.files[a.fileId],[tw,th]=SIZE[group],b=s.bleed,dpmm=dpi/25.4,sb=project.groups[group].mode==='bleed'?s.sourceBleed:0;
 let img;
 if(file.mime==='application/pdf'){
  const page=await (await pdfDoc(file,a.fileId)).getPage(a.page),viewport=page.getViewport({scale:1});
  const scale=Math.max((tw+2*sb)*dpmm/viewport.width,(th+2*sb)*dpmm/viewport.height),vp=page.getViewport({scale});
  if(vp.width*vp.height>18000000)throw Error('Esta página PDF tem proporções incompatíveis com o componente. Usa uma peça por página.');
  img=canvas(vp.width,vp.height);const ctx=img.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,img.width,img.height);await page.render({canvasContext:ctx,viewport:vp}).promise;
 }else img=await imageOf(file.data);
 const c=canvas((tw+2*b)*dpmm,(th+2*b)*dpmm),ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
 fit(ctx,img,(b-sb)*dpmm,(b-sb)*dpmm,(tw+2*sb)*dpmm,(th+2*sb)*dpmm,s.fit);
 // Extend edge pixels only outside the supplied artwork; the trim area is never stretched.
 if(b>sb){
  const e=(b-sb)*dpmm,left=Math.ceil(e)+1,right=Math.floor(c.width-e)-2,top=Math.ceil(e)+1,bottom=Math.floor(c.height-e)-2;
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(c,left,0,1,c.height,0,0,e,c.height);ctx.drawImage(c,right,0,1,c.height,c.width-e,0,e,c.height);
  ctx.drawImage(c,0,top,c.width,1,0,0,c.width,e);ctx.drawImage(c,0,bottom,c.width,1,0,c.height-e,c.width,e);
  ctx.imageSmoothingEnabled=true;
 }
 const result={canvas:c,dpmm};renderCache.set(key,result);
 while(renderCache.size>6){const [old,r]=renderCache.entries().next().value;renderCache.delete(old);r.canvas.width=1;r.canvas.height=1;}
 return result;
}
export async function tileArt(project,p,dpi){
 const {canvas:full,dpmm}=await renderArt(project,p.assetId,p.group,dpi),b=project.settings.bleed;
 if(!p.crop)return {canvas:full,dpmm};
 const tile=canvas((p.w+2*b)*dpmm,(p.h+2*b)*dpmm),ctx=tile.getContext('2d');
 ctx.drawImage(full,p.crop.x*dpmm,p.crop.y*dpmm,(p.w+2*b)*dpmm,(p.h+2*b)*dpmm,0,0,tile.width,tile.height);
 return {canvas:tile,dpmm};
}
export function qualityNotes(project,component){
 const group=component==='cards'?'fronts':component,[w,h]=SIZE[group],b=project.groups[group].mode==='bleed'?project.settings.sourceBleed:0;
 return project.groups[group].assets.flatMap(a=>{
  const file=project.files[a.fileId];
  if(file.mime==='image/svg+xml'){const source=new TextDecoder().decode(bytesOf(file.data));if(source.includes('<text')&&!source.includes('@font-face'))return [`${a.name}: SVG com texto. Incorpora as fontes ou converte o texto em curvas para preservar a tipografia.`];}
  const p=a.pixels;if(!p)return [];
  const dpi=Math.min(p[0]/((w+2*b)/25.4),p[1]/((h+2*b)/25.4)),ratio=p[0]/p[1],wanted=(w+2*b)/(h+2*b);
  const notes=[];if(dpi<200&&project.files[a.fileId].mime!=='image/svg+xml')notes.push(`${a.name}: resolução de origem ≈ ${Math.round(dpi)} dpi.`);
  if(Math.abs(ratio/wanted-1)>.03)notes.push(`${a.name}: proporções diferentes; será ${project.settings.fit==='cover'?'recortada':'centrada com margens brancas'}.`);
  return notes;
 }).slice(0,4);
}
