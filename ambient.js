// Original generative ambient score for INTERVAL. No samples or recorded music.
const CHORDS=[[50,57,64,69],[43,55,62,69],[45,57,64,71],[47,55,62,69]];
const MELODY=[62,64,67,69,71,74,76,79];
const hz=m=>440*2**((m-69)/12);
export class AmbientScore {
 constructor(context,{random=Math.random}={}){
  this.ctx=context;this.random=random;this.voices=new Set();this.volume=.35;this.lastNote=3;this.chord=-1;
  const c=context;this.output=c.createGain();this.output.gain.value=0;
  const filter=c.createBiquadFilter();filter.type='lowpass';filter.frequency.value=2300;filter.Q.value=.35;
  this.bus=c.createGain();this.bus.gain.value=2.4;this.bus.connect(filter);filter.connect(this.output);this.output.connect(c.destination);
  // A short, diffuse stereo space, built once; no downloaded audio.
  const reverb=c.createConvolver(),length=Math.ceil(c.sampleRate*3.6),ir=c.createBuffer(2,length,c.sampleRate);
  for(let ch=0;ch<2;ch++){const data=ir.getChannelData(ch);let smooth=0;for(let i=0;i<length;i++){smooth=.65*smooth+.35*(this.random()*2-1);data[i]=smooth*(1-i/length)**2.8;}}
  reverb.buffer=ir;const wet=c.createGain();wet.gain.value=.32;this.bus.connect(reverb);reverb.connect(wet);wet.connect(filter);
  const delay=c.createDelay(3),feedback=c.createGain(),echoFilter=c.createBiquadFilter(),echo=c.createGain();
  delay.delayTime.value=1.73;feedback.gain.value=.23;echo.gain.value=.13;echoFilter.type='lowpass';echoFilter.frequency.value=1300;
  this.bus.connect(delay);delay.connect(echoFilter);echoFilter.connect(feedback);feedback.connect(delay);echoFilter.connect(echo);echo.connect(filter);
  this.nodes=[this.bus,filter,reverb,wet,delay,feedback,echoFilter,echo,this.output];
 }
 rand(a,b){return a+(b-a)*this.random();}
 setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.running)this.fade(this.volume*.65,.5);}
 fade(value,seconds){const p=this.output.gain,t=this.ctx.currentTime;p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);p.linearRampToValueAtTime(value,t+seconds);}
 start(){if(this.running)return;this.running=true;const now=this.ctx.currentTime;if(!Number.isFinite(this.nextPad)||this.nextPad<now)this.nextPad=now+.12;if(!Number.isFinite(this.nextNote)||this.nextNote<now)this.nextNote=now+3;this.fade(this.volume*.65,3);this.tick();}
 stop(){this.running=false;this.fade(0,1.2);}
 tick(){if(!this.running)return;const now=this.ctx.currentTime;
  if(this.nextPad<now+.7){this.pad(Math.max(now+.05,this.nextPad));this.nextPad=now+this.rand(48,68);}
  if(this.nextNote<now+.7){if(this.random()>.16)this.note(Math.max(now+.05,this.nextNote));this.nextNote=now+this.rand(5.5,12.5);}
 }
 voice(midi,start,duration,level,pan,attack,kind='pad'){
  // Bound polyphony even if a device stalls or a timer is throttled.
  if(this.voices.size>=16)return;
  const c=this.ctx,amp=c.createGain(),panner=c.createStereoPanner(),osc=c.createOscillator();
  panner.pan.value=pan;osc.type='sine';osc.frequency.value=hz(midi);osc.detune.value=this.rand(-3,3);
  amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(level,start+attack);
  amp.gain.exponentialRampToValueAtTime(Math.max(.0001,level*.45),start+duration*.65);amp.gain.linearRampToValueAtTime(0,start+duration);
  osc.connect(amp);amp.connect(panner);panner.connect(this.bus);
  // A quiet second harmonic gives the sparse upper notes a soft, rounded colour.
  let harmonic,harmonicGain;
  if(kind==='note'){harmonic=c.createOscillator();harmonic.frequency.value=hz(midi)*2;harmonicGain=c.createGain();harmonicGain.gain.value=.12;harmonic.connect(harmonicGain);harmonicGain.connect(amp);harmonic.start(start);harmonic.stop(start+duration);}
  const v={osc,harmonic,amp,panner,harmonicGain};this.voices.add(v);
  osc.onended=()=>{for(const node of [osc,harmonic,amp,panner,harmonicGain])node?.disconnect();this.voices.delete(v);};
  osc.start(start);osc.stop(start+duration);
 }
 pad(at){
  const options=CHORDS.map((_,i)=>i).filter(i=>i!==this.chord);this.chord=options[Math.floor(this.random()*options.length)];
  CHORDS[this.chord].forEach((m,i)=>this.voice(m,at+i*.45,this.rand(76,88),.023,this.rand(-.55,.55),this.rand(10,16)));
 }
 note(at){
  const options=MELODY.map((_,i)=>i).filter(i=>i!==this.lastNote&&Math.abs(MELODY[i]-MELODY[this.lastNote])<=7);
  this.lastNote=options[Math.floor(this.random()*options.length)];
  this.voice(MELODY[this.lastNote],at,this.rand(10,18),this.rand(.026,.045),this.rand(-.65,.65),this.rand(.65,1.8),'note');
 }
 dispose(){this.running=false;for(const v of this.voices){v.osc.onended=null;for(const n of [v.osc,v.harmonic]){try{n?.stop();}catch{}}for(const n of [v.osc,v.harmonic,v.amp,v.panner,v.harmonicGain])n?.disconnect();}this.voices.clear();for(const n of this.nodes)n.disconnect();}
}
