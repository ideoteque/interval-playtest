import {emptyProject,plan,checkedSettings,validateProject,expand,VERSION} from './layout.js';
import {preset,readFiles,clearArtCache,qualityNotes,sanitizeSVG,bytesOf,svgData} from './art.js';
import {pageSVG,pdfFile,svgZip,calibrationPages} from './export.js';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let project=emptyProject(),component='cards',pageIndex=0,currentPlan=null,renderId=0,uploadGroup='fronts',uploadAppend=false,timer,db,busyFlag=false,downloadURL;
const NAMES={cards:'Cartas',market:'Mercado',boards:'Bases dos jogadores',calibration:'Calibração',fronts:'Frentes',backs:'Versos'};
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,5500);}
async function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open('interval-print-studio',1);req.onupgradeneeded=()=>req.result.createObjectStore('project');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function loadSaved(){try{db=await openDB();return await new Promise((resolve,reject)=>{const req=db.transaction('project').objectStore('project').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch{return null;}}
function saveSoon(){
 $('#save-status').textContent='A guardar neste dispositivo…';clearTimeout(timer);
 timer=setTimeout(()=>{
  if(!db){$('#save-status').textContent='Usa Guardar projeto para conservar a prova';return;}
  try{const tx=db.transaction('project','readwrite');tx.objectStore('project').put(project,'current');tx.oncomplete=()=>$('#save-status').textContent='Guardado neste dispositivo';tx.onerror=()=>$('#save-status').textContent='Sem espaço local · usa Guardar projeto';}catch{$('#save-status').textContent='Usa Guardar projeto para conservar a prova';}
 },600);
}
function syncFields(){
 $('#project-name').value=project.name;
 for(const el of $$('[data-setting]')){const key=el.dataset.setting;if(el.type==='checkbox')el.checked=project.settings[key];else el.value=String(project.settings[key]);}
}
function selectedGroups(){return component==='cards'?['fronts','backs']:component==='calibration'?[]:[component];}
function uploadUI(){
 $('#upload-groups').innerHTML=selectedGroups().map(k=>{
  const group=project.groups[k],count=expand(group).length;
  return `<div class="upload-box"><div class="upload-title"><span>${NAMES[k]}</span><small>${count} ${k==='backs'&&count===1?'verso comum':count===1?'elemento':'elementos'}</small></div><button class="upload-button" data-upload="${k}">${count?'Substituir':'Carregar'} ${NAMES[k].toLowerCase()}<span>＋</span></button><select data-source="${k}" aria-label="Sangria da arte: ${NAMES[k]}"><option value="trim" ${group.mode==='trim'?'selected':''}>Só área de corte · criar sangria</option><option value="bleed" ${group.mode==='bleed'?'selected':''}>Com sangria incluída</option></select>${group.assets.length?`<div class="asset-tools">${k!=='market'?`<button class="text-button" data-add="${k}">Adicionar mais</button>`:'<span></span>'}<button class="text-button" data-clear="${k}">Limpar ${NAMES[k].toLowerCase()}</button></div>`:''}</div>`;
 }).join('');
 $('#asset-list').innerHTML=selectedGroups().map(k=>project.groups[k].assets.length?`<div class="asset-tools"><span class="mini-label">${NAMES[k]} · ORDEM DE IMPRESSÃO</span></div><div class="asset-list">${project.groups[k].assets.map((a,i)=>`<div class="asset-row"><span class="ordinal">${String(i+1).padStart(2,'0')}</span><span class="name" title="${esc(a.name)}">${esc(a.name)}</span>${k==='boards'?`<input type="number" min="1" max="20" value="${a.quantity}" data-quantity="${a.id}" data-group="${k}" aria-label="Cópias de ${esc(a.name)}">`:''}<button class="reorder" data-up="${i}" data-group="${k}" ${i===0?'disabled':''} aria-label="Subir ${esc(a.name)}">↑</button><button class="reorder" data-down="${i}" data-group="${k}" ${i===project.groups[k].assets.length-1?'disabled':''} aria-label="Descer ${esc(a.name)}">↓</button><button class="remove" data-remove="${a.id}" data-group="${k}" aria-label="Remover ${esc(a.name)}">×</button></div>`).join('')}</div>`:'').join('');
}
function rebuild(){
 try{project.settings=checkedSettings(project.settings);currentPlan=component==='calibration'?{pages:calibrationPages(project.settings),errors:[],warnings:[],sheets:1,faces:2,capacity:0}:plan(project,component);}catch(e){currentPlan={pages:[],errors:[e.message],warnings:[],sheets:0,faces:0,capacity:0};}
 pageIndex=Math.min(pageIndex,Math.max(0,currentPlan.pages.length-1));
 $('#cards-count').textContent=expand(project.groups.fronts).length;
 $('#preview-title').textContent=NAMES[component];$('#preview-kicker').textContent=`A4 · ${project.settings.box==='balanced'?'EQUILIBRADA':'BASES PLANAS'}`;
 $('#art-section').hidden=component==='calibration';$('#duplex-section').hidden=!['cards','calibration'].includes(component);
 $('#side').hidden=component==='calibration';$('label[for="side"]').hidden=component==='calibration';
 $('#box-hint').textContent=project.settings.box==='balanced'?'Bases: uma dobra a 120 mm. Mercado: painéis fechados de 120 × 90 mm.':'Bases sem dobra. Mercado: uma dobra na união, fechado em 240 × 90 mm.';
 $$('.components button').forEach(b=>{const active=b.dataset.component===component;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 uploadUI();
 const notes=component==='calibration'?[]:component==='cards'?[...qualityNotes(project,'cards'),...qualityNotes(project,'backs')].slice(0,4):qualityNotes(project,component);
 const warnings=[...currentPlan.warnings,...notes];
 if(component==='cards'&&currentPlan.capacity&&currentPlan.capacity!==15)warnings.unshift(`Com estas definições cabem ${currentPlan.capacity} cartas por A4. O Studio recalculou o número de folhas.`);
 $('#messages').innerHTML=[...currentPlan.errors.map(t=>`<div class="message error" role="alert">${esc(t)}</div>`),...warnings.map(t=>`<div class="message">${esc(t)}</div>`)].join('');
 $('#metrics').innerHTML=`<span><b>${currentPlan.sheets}</b>${currentPlan.sheets===1?'folha':'folhas'} A4</span><span><b>${currentPlan.faces}</b>${currentPlan.faces===1?'face':'faces'}</span>${component==='cards'?`<span><b>${currentPlan.capacity}</b>cartas / face</span>`:''}`;
 const disabled=!!currentPlan.errors.length||!currentPlan.pages.length;
 $('#export-pdf').disabled=$('#export-svg').disabled=disabled;
 $('#export-summary').textContent=disabled?'Confirma a arte e as definições':`${currentPlan.sheets} ${currentPlan.sheets===1?'folha':'folhas'} · ${currentPlan.faces} ${currentPlan.faces===1?'face':'faces'} · ${NAMES[component]}`;
 $('#export-detail').textContent=component==='cards'&&project.settings.side==='both'?'PDF com frentes e versos alternados da mesma folha.':'Arte e guias em A4 à escala real.';
 $('#production-note').textContent=component==='market'?'Corta duas metades de 240 × 90 mm e une-as borda com borda, com fita pelo verso.':component==='calibration'?'Imprime frente e verso a 100%. Mede a régua e confere as cruzes contra a luz.':'Imprime a 100%, sem ajustar à página e sem modo sem margens.';
 preview();
}
async function preview(){
 const token=++renderId,page=currentPlan.pages[pageIndex];
 $('#prev-page').disabled=pageIndex===0;$('#next-page').disabled=pageIndex>=currentPlan.pages.length-1;
 $('#page-label').textContent=page?`${page.label} · A4 ${page.orientation==='landscape'?'horizontal':'vertical'} · ${pageIndex+1}/${currentPlan.pages.length}`:'Sem folhas para mostrar';
 if(!page){$('#preview-loading').hidden=true;$('#paper').classList.remove('landscape');$('#paper').innerHTML='<div class="empty-preview">A tua prova aparece aqui.<br>Carrega a arte ou escolhe «Usar arte INTERVAL».</div>';return;}
 $('#preview-loading').hidden=false;
 try{
  const svg=await pageSVG(project,page,{preview:true,dpi:110});
  if(token!==renderId)return;
  $('#paper').classList.toggle('landscape',page.orientation==='landscape');$('#paper').innerHTML=svg;
 }catch(e){if(token===renderId){$('#paper').innerHTML=`<div class="empty-preview">${esc(e.message)}</div>`;toast(e.message);}}
 finally{if(token===renderId)$('#preview-loading').hidden=true;}
}
function changed(){pageIndex=0;rebuild();saveSoon();}
async function busy(title,fn){
 if(busyFlag)return;busyFlag=true;$('#busy-title').textContent=title;$('#busy-message').textContent='A preparar…';$('#busy-dialog').showModal();
 try{return await fn(t=>$('#busy-message').textContent=t);}catch(e){console.error(e);toast(e.message||'Não foi possível concluir esta operação.');}finally{busyFlag=false;$('#busy-dialog').close();}
}
function gcFiles(){const used=new Set(Object.values(project.groups).flatMap(g=>g.assets.map(a=>a.fileId)));for(const id of Object.keys(project.files))if(!used.has(id))delete project.files[id];}
function offerDownload(blob,name){
 if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);
 const link=$('#download-link');link.href=downloadURL;link.download=name;$('#download-status').textContent=name;$('#download-ready').hidden=false;link.click();
}
async function usePreset(initial=false){
 if(!initial&&Object.values(project.groups).some(g=>g.assets.length)&&!confirm('Substituir a arte deste projeto pela arte atual do INTERVAL? Podes guardar o projeto antes.'))return;
 await busy('A carregar a arte INTERVAL',async progress=>{progress('Cartas, verso, mercado e bases aprovadas…');const result=await preset();clearArtCache();project.files=result.files;project.groups=result.groups;changed();});
}
function sanitizeProject(p){
 validateProject(p);
 for(const f of Object.values(p.files))if(f.mime==='image/svg+xml')f.data=svgData(sanitizeSVG(new TextDecoder().decode(bytesOf(f.data))));
 return p;
}
document.addEventListener('click',async e=>{
 const componentBtn=e.target.closest('[data-component]');if(componentBtn){component=componentBtn.dataset.component;pageIndex=0;rebuild();return;}
 const upload=e.target.closest('[data-upload]'),add=e.target.closest('[data-add]');if(upload||add){uploadGroup=upload?upload.dataset.upload:add.dataset.add;uploadAppend=!!add;$('#art-input').multiple=uploadGroup!=='market';$('#art-input').click();return;}
 const clear=e.target.closest('[data-clear]');if(clear){const key=clear.dataset.clear;if(!confirm(`Remover a arte de ${NAMES[key].toLowerCase()} deste projeto?`))return;project.groups[key].assets=[];gcFiles();clearArtCache();changed();return;}
 const remove=e.target.closest('[data-remove]');if(remove){const g=project.groups[remove.dataset.group];g.assets=g.assets.filter(a=>a.id!==remove.dataset.remove);gcFiles();changed();return;}
 const up=e.target.closest('[data-up]'),down=e.target.closest('[data-down]');if(up||down){const b=up||down,g=project.groups[b.dataset.group],i=Number(up?b.dataset.up:b.dataset.down),j=i+(up?-1:1);[g.assets[i],g.assets[j]]=[g.assets[j],g.assets[i]];changed();return;}
 if(e.target.closest('[data-close]'))$('#help-dialog').close();
});
document.addEventListener('change',e=>{
 const el=e.target;
 if(el.matches('[data-setting]')){
  const key=el.dataset.setting,old=project.settings[key],value=el.type==='checkbox'?el.checked:el.type==='number'||key==='dpi'?Number(el.value):el.value;
  try{project.settings=checkedSettings({...project.settings,[key]:value});changed();}catch(err){project.settings[key]=old;syncFields();toast(err.message);}return;
 }
 if(el.matches('[data-source]')){project.groups[el.dataset.source].mode=el.value;changed();}
 if(el.matches('[data-quantity]')){const a=project.groups[el.dataset.group].assets.find(a=>a.id===el.dataset.quantity),value=Number(el.value);if(!Number.isInteger(value)||value<1||value>20){el.value=a.quantity;toast('Usa entre 1 e 20 cópias.');return;}a.quantity=value;changed();}
});
$('#project-name').addEventListener('input',e=>{project.name=e.target.value.trim()||'INTERVAL · Prova caseira';saveSoon();});
$('#art-input').addEventListener('change',async e=>{
 const files=[...e.target.files];e.target.value='';if(!files.length)return;
 await busy('A carregar a tua arte',async progress=>{
  const existing=uploadAppend?project.groups[uploadGroup].assets:[];
  const reading={groups:{...project.groups,[uploadGroup]:{...project.groups[uploadGroup],assets:existing}}};
  const added=await readFiles(files,reading,uploadGroup,progress);
  const next={...project,files:{...project.files,...added.files},groups:{...project.groups,[uploadGroup]:{...project.groups[uploadGroup],assets:[...existing,...added.assets]}}};
  validateProject(next);project=next;gcFiles();changed();
 });
});
$('#preset-btn').onclick=()=>usePreset();
$('#save-project').onclick=()=>{
 gcFiles();offerDownload(new Blob([JSON.stringify(project)],{type:'application/json'}),'INTERVAL_Print_Studio.interval.json');
};
$('#open-project').onclick=()=>$('#project-input').click();
$('#project-input').onchange=async e=>{
 const file=e.target.files[0];e.target.value='';if(!file)return;
 if(file.size>180000000){toast('O projeto pode ter no máximo 180 MB.');return;}
 if(Object.values(project.groups).some(g=>g.assets.length)&&!confirm('Abrir este projeto e substituir o que está no ecrã? Guarda primeiro se quiseres conservar esta prova.'))return;
 await busy('A abrir projeto',async()=>{const p=sanitizeProject(JSON.parse(await file.text()));clearArtCache();project=p;syncFields();changed();});
};
$('#help-btn').onclick=()=>$('#help-dialog').showModal();
$('#busy-dialog').addEventListener('cancel',e=>e.preventDefault());
$('#prev-page').onclick=()=>{if(pageIndex>0){pageIndex--;preview();}};
$('#next-page').onclick=()=>{if(pageIndex<currentPlan.pages.length-1){pageIndex++;preview();}};
$('#calibrate-link').onclick=()=>{component='calibration';pageIndex=0;rebuild();window.scrollTo({top:0,behavior:'smooth'});};
$('#dismiss-download').onclick=()=>$('#download-ready').hidden=true;
async function exportJob(format){
 if(currentPlan.errors.length)return;const pages=currentPlan.pages;
 const blob=await busy(format==='pdf'?'A preparar PDF':'A preparar folhas SVG',progress=>format==='pdf'?pdfFile(project,pages,progress):svgZip(project,pages,progress));
 if(blob)offerDownload(blob,`INTERVAL_${component}_${project.settings.box}_${component==='cards'?project.settings.side:'A4'}.${format==='pdf'?'pdf':'zip'}`);
}
$('#export-pdf').onclick=()=>exportJob('pdf');$('#export-svg').onclick=()=>exportJob('svg');
async function boot(){
 syncFields();rebuild();
 const saved=await loadSaved();
 if(saved){try{project=sanitizeProject(saved);syncFields();rebuild();$('#save-status').textContent='Projeto recuperado deste dispositivo';return;}catch(e){console.warn(e);toast('Não foi possível recuperar o projeto local. Podes abrir uma cópia guardada.');}}
 await usePreset(true);
}
boot();
window.addEventListener('beforeunload',()=>{if(downloadURL)URL.revokeObjectURL(downloadURL);});
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
