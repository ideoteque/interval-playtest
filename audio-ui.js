import {AmbientScore} from './ambient.js';
const $=s=>document.querySelector(s),dialog=$('#sound-dialog'),toggle=$('#sound-toggle'),volume=$('#sound-volume'),status=$('#sound-status');
let context,score,timer,enabled=false,pending=false;
try{const saved=localStorage.getItem('interval-music-volume');if(saved!==null&&Number.isFinite(Number(saved)))volume.value=String(Math.max(0,Math.min(100,Number(saved))));}catch{}
function update(){
 const playing=enabled&&context?.state==='running'&&!document.hidden;
 toggle.textContent=pending?'A preparar…':playing?'Desligar música':enabled?'Retomar música':'Ativar música';toggle.disabled=pending;
 for(const b of document.querySelectorAll('[data-sound]')){b.setAttribute('aria-label',playing?'Música ambiente ligada · abrir controlos':'Música ambiente · abrir controlos');b.classList.toggle('sound-on',playing);}
 status.textContent=playing?'A tocar · cada sessão evolui de forma diferente.':enabled?'Em pausa. Toca em Retomar música para continuar.':'Um ambiente suave, sem ritmo marcado. Ativa quando quiseres.';
 $('#sound-level').textContent=volume.value+'%';
}
async function enable(){
 if(pending)return;pending=true;update();
 try{
  if(!context||context.state==='closed'){
   const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('unsupported');
   context=new Audio({latencyHint:'playback'});score=new AmbientScore(context);score.setVolume(Number(volume.value)/100);
   context.addEventListener('statechange',update);
  }
  // Resume is invoked directly from a tap, including on iPad/iPhone.
  await context.resume();enabled=true;score.start();clearInterval(timer);timer=setInterval(()=>score.tick(),400);
 }catch{clearInterval(timer);score?.dispose();score=null;context?.close().catch(()=>{});context=null;enabled=false;status.textContent='Não foi possível ativar o som. Tenta novamente ou verifica as definições de áudio do navegador.';pending=false;toggle.disabled=false;toggle.textContent='Tentar novamente';return;}
 pending=false;update();
}
async function disable(){enabled=false;clearInterval(timer);score?.stop();update();const c=context;setTimeout(()=>{if(!enabled&&c===context&&c?.state==='running')c.suspend().catch(()=>{});},1400);}
for(const b of document.querySelectorAll('[data-sound]'))b.addEventListener('click',()=>{update();dialog.showModal();});
$('#sound-close').onclick=()=>dialog.close();
toggle.onclick=()=>{if(enabled&&context?.state==='running'&&!document.hidden)disable();else enable();};
volume.addEventListener('input',()=>{score?.setVolume(Number(volume.value)/100);try{localStorage.setItem('interval-music-volume',volume.value);}catch{}update();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){context?.suspend().catch(()=>{});clearInterval(timer);update();}else update();});
window.addEventListener('pagehide',()=>{clearInterval(timer);context?.suspend().catch(()=>{});});
update();
