import test from 'node:test';
import assert from 'node:assert/strict';
import {AmbientScore} from '../ambient.js';
function context(){
 const params=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){assert(v>0);this.value=v;}});
 const c={currentTime:0,sampleRate:8000,destination:{},all:[],createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)};}};
 const node=()=>{const n={gain:params(),frequency:params(),detune:params(),pan:params(),Q:params(),delayTime:params(),connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.ended=t;}};c.all.push(n);return n;};
 for(const name of ['Gain','BiquadFilter','Convolver','Delay','Oscillator','StereoPanner'])c['create'+name]=node;
 c.advance=t=>{c.currentTime=t;for(const n of c.all)if(n.onended&&n.ended<=t){const end=n.onended;n.onended=null;end();}};
 return c;
}
function rng(seed){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};}
test('Ambiente: inicia em silêncio; ligar e desligar repetidamente não acumula camadas',()=>{
 const c=context(),s=new AmbientScore(c,{random:rng(1)});assert.equal(s.output.gain.value,0);assert.equal(s.voices.size,0);
 s.start();assert.equal(s.voices.size,4);for(let i=0;i<30;i++){s.stop();s.start();}assert.equal(s.voices.size,4);
 s.stop();assert.equal(s.output.gain.value,0);const count=s.voices.size;c.advance(10);s.tick();assert.equal(s.voices.size,count);s.dispose();assert.equal(s.voices.size,0);assert(c.all.every(n=>n.disconnected));
});
test('Ambiente: 25 minutos de música têm polifonia limitada e libertam as vozes',()=>{
 const c=context(),s=new AmbientScore(c,{random:rng(2)});s.start();let max=0,chords=new Set();
 for(let t=0;t<1500;t+=.4){c.advance(t);s.tick();max=Math.max(max,s.voices.size);chords.add(s.chord);}
 assert(max<=16);assert(max>=8);assert.equal(chords.size,4);s.stop();c.advance(1600);assert.equal(s.voices.size,0);s.dispose();
});
test('Ambiente: regressar após uma interrupção não dispara as notas em atraso',()=>{
 const c=context(),s=new AmbientScore(c,{random:rng(3)});s.start();c.advance(900);s.tick();assert(s.voices.size<=5);assert(s.nextPad>900);assert(s.nextNote>900);s.dispose();
});
test('Ambiente: volume zero mantém silêncio e valores inválidos são limitados',()=>{
 const c=context(),s=new AmbientScore(c,{random:rng(4)});s.setVolume(0);s.start();assert.equal(s.output.gain.value,0);s.setVolume(10);assert(s.output.gain.value<=.65);s.setVolume(-1);assert.equal(s.output.gain.value,0);s.setVolume(NaN);assert.equal(s.output.gain.value,0);s.dispose();
});
