import {MM,SIZE,mirror} from './layout.js';
import {tileArt} from './art.js';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export async function pageSVG(project,page,{preview=false,dpi=300}={}){
 const b=project.settings.bleed,defs=[],content=[],images=new Map();let n=0;
 for(const p of page.placements){
  const key=[p.assetId,p.group,p.crop?.x||0,p.crop?.y||0].join('|');
  if(!images.has(key)){
   const {canvas}=await tileArt(project,p,dpi),id=`art${n++}`;
   defs.push(`<image id="${id}" width="${p.w+2*b}" height="${p.h+2*b}" href="${canvas.toDataURL('image/png')}"/>`);images.set(key,id);
  }
  content.push(`<use href="#${images.get(key)}" x="${p.x-b}" y="${p.y-b}"/>`);
  // Keep original SVG artwork vector-based over the raster edge extension.
  const a=project.groups[p.group].assets.find(a=>a.id===p.assetId),file=project.files[a.fileId];
  if(!preview&&file.mime==='image/svg+xml'){
   const [w,h]=SIZE[p.group],sb=project.groups[p.group].mode==='bleed'?project.settings.sourceBleed:0,id=`clip${n++}`;
   const bleedClip=sb>=b;
   defs.push(`<clipPath id="${id}"><rect x="${p.x-(bleedClip?b:0)}" y="${p.y-(bleedClip?b:0)}" width="${p.w+(bleedClip?2*b:0)}" height="${p.h+(bleedClip?2*b:0)}"/></clipPath>`);
   content.push(`<image href="${xml(file.data)}" x="${p.x-(p.crop?.x||0)-sb}" y="${p.y-(p.crop?.y||0)-sb}" width="${w+2*sb}" height="${h+2*sb}" preserveAspectRatio="xMidYMid ${project.settings.fit==='contain'?'meet':'slice'}" clip-path="url(#${id})"/>`);
  }
  if(preview)content.push(`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="none" stroke="#604b94" stroke-opacity=".5" stroke-width=".15" stroke-dasharray="1 1"/>`);
 }
 for(const g of page.guides)content.push(`<line x1="${g.a[0]}" y1="${g.a[1]}" x2="${g.b[0]}" y2="${g.b[1]}" stroke="${g.type==='fold'?'#604b94':'#151515'}" stroke-width=".18"${g.type==='fold'?' stroke-dasharray=".6 .4"':''}/>`);
 if(page.calibration)content.push(...calibrationElements(page).svg);
 if(preview)content.push(`<rect x="${project.settings.margin}" y="${project.settings.margin}" width="${page.W-2*project.settings.margin}" height="${page.H-2*project.settings.margin}" fill="none" stroke="#a5a5a5" stroke-width=".15" stroke-dasharray="1 2"/>`);
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${page.W}mm" height="${page.H}mm" viewBox="0 0 ${page.W} ${page.H}"><title>${xml(page.label)}</title><defs>${defs.join('')}</defs><rect width="${page.W}" height="${page.H}" fill="white"/>${content.join('')}</svg>`;
}
export async function pdfFile(project,pages,progress=()=>{}){
 const {PDFDocument,rgb,StandardFonts,PrintScaling}=globalThis.PDFLib,pdf=await PDFDocument.create();
 pdf.setTitle(`${project.name} - Print Studio`);pdf.setProducer('INTERVAL Print Studio 1.0');
 pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
 const font=await pdf.embedFont(StandardFonts.Helvetica),cache=new Map();
 for(let i=0;i<pages.length;i++){
  progress(`A preparar PDF · face ${i+1} de ${pages.length}`);
  const source=pages[i],p=pdf.addPage([source.W*MM,source.H*MM]),b=project.settings.bleed;
  for(const place of source.placements){
   const key=[place.assetId,place.group,place.crop?.x||0,place.crop?.y||0].join('|');
   if(!cache.has(key)){const {canvas}=await tileArt(project,place,project.settings.dpi);cache.set(key,await pdf.embedPng(canvas.toDataURL('image/png')));}
   p.drawImage(cache.get(key),{x:(place.x-b)*MM,y:(source.H-place.y-place.h-b)*MM,width:(place.w+2*b)*MM,height:(place.h+2*b)*MM});
  }
  for(const g of source.guides)p.drawLine({start:{x:g.a[0]*MM,y:(source.H-g.a[1])*MM},end:{x:g.b[0]*MM,y:(source.H-g.b[1])*MM},thickness:.18*MM,color:g.type==='fold'?rgb(.376,.294,.58):rgb(.06,.06,.06),...(g.type==='fold'?{dashArray:[.6*MM,.4*MM]}:{})});
  if(source.calibration){
   const {lines,labels}=calibrationElements(source);
   for(const l of lines)p.drawLine({start:{x:l[0]*MM,y:(source.H-l[1])*MM},end:{x:l[2]*MM,y:(source.H-l[3])*MM},thickness:.2*MM,color:rgb(0,0,0)});
   for(const l of labels)p.drawText(l.text,{x:l.x*MM,y:(source.H-l.y)*MM,size:l.size*MM,font,color:rgb(0,0,0)});
  }
  await new Promise(r=>setTimeout(r,0));
 }
 return new Blob([await pdf.save()],{type:'application/pdf'});
}
export async function svgZip(project,pages,progress=()=>{}){
 const zip=new globalThis.JSZip();
 for(let i=0;i<pages.length;i++){progress(`A preparar SVG · face ${i+1} de ${pages.length}`);zip.file(`INTERVAL_${String(i+1).padStart(2,'0')}_${pages[i].side}.svg`,await pageSVG(project,pages[i],{dpi:project.settings.dpi}));}
 zip.file('LER-ANTES-DE-IMPRIMIR.txt','INTERVAL Print Studio\nFolhas A4 em milimetros. Imprimir a 100%, tamanho real, sem ajustar e sem modo sem margens.\nLinhas pretas: corte. Marcas roxas: vincar/dobrar; apenas fora da arte.\nNo mercado, cortar as duas metades pelo tamanho final e unir borda com borda pelo verso, sem sobrepor a area de jogo.\nA arte SVG de origem permanece incorporada em SVG; as guias sao vetoriais. Imagens de origem e PDF importado continuam raster nas folhas SVG.\nNa impressao frente e verso, usar a borda escolhida no Studio e testar primeiro a calibracao.\n');
 return zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});
}
export function calibrationPages(s){
 return ['front','back'].map(side=>({W:210,H:297,side,orientation:'portrait',placements:[],guides:[],label:`Calibração · ${side==='front'?'frente':'verso'}`,calibration:true,settings:s}));
}
function calibrationElements(page){
 const s=page.settings,lines=[],labels=[{text:`INTERVAL - CALIBRACAO ${page.side==='front'?'FRENTE':'VERSO'}`,x:24,y:22,size:4},{text:'A4 / 100% / tamanho real / sem ajustar',x:24,y:30,size:3},{text:`Virar na borda ${s.duplex==='long'?'longa':'curta'}`,x:24,y:38,size:3}];
 const base=[[35,65,'A'],[175,65,'B'],[35,237,'C'],[175,237,'D']];
 for(const [x,y,id]of base){const p=page.side==='back'?mirror({x:x-8,y:y-8,w:16,h:16},210,297,s):{x:x-8,y:y-8,w:16,h:16};const cx=p.x+8,cy=p.y+8;
  lines.push([cx-8,cy,cx+8,cy],[cx,cy-8,cx,cy+8]);labels.push({text:id,x:cx+3,y:cy-3,size:4});
 }
 lines.push([55,148,155,148]);for(let i=0;i<=10;i++)lines.push([55+i*10,145,55+i*10,151]);
 labels.push({text:'Esta linha tem de medir exatamente 100 mm',x:55,y:160,size:3},{text:'Segura a folha contra a luz: as cruzes devem coincidir.',x:24,y:267,size:3},{text:'Se o verso ficar a direita/abaixo, usa uma correcao X/Y negativa.',x:24,y:275,size:2.5});
 const svg=[...lines.map(l=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="black" stroke-width=".2"/>`),...labels.map(l=>`<text x="${l.x}" y="${l.y}" font-family="Arial,sans-serif" font-size="${l.size}">${xml(l.text)}</text>`)];
 return {lines,labels,svg};
}
