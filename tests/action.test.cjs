'use strict';
const path = require('node:path');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let source=fs.readFileSync(path.join(__dirname, '..', 'dist', 'games-action.js'),'utf8');
source=source.replace('window.PromptGames.garden = mountGarden;','window.PromptGames.garden = mountGarden;window.actionTest={parseFilter,parseDefense};');
source=source.replace("function draw(){const ctx=ui.ctx;background(ctx,time);ctx.strokeStyle='#c4f57224';","function draw(){window.catchProbe={items,x,running,orderIndex,counts,done,failed,order:order()};const ctx=ui.ctx;background(ctx,time);ctx.strokeStyle='#c4f57224';");
source=source.replace("function draw(){const ctx=ui.ctx;background(ctx,time);ctx.strokeStyle='#34452d';","function draw(){window.defProbe={wave,enemies,health,running,paused,done,failed,rule,towers};const ctx=ui.ctx;background(ctx,time);ctx.strokeStyle='#34452d';");
source=source.replace('function draw(){ctx.clearRect(0,0,W,H);', 'function draw(){window.gardenProbe={drones,goalIndex,goal,target,paused,won,bumps,spread};ctx.clearRect(0,0,W,H);');
function harness(game,stage){
  let nextFrame=null,frameId=0,time=0,result=null,completionCount=0;const events=[];const nodes=new Map();
  const gradient={addColorStop(){}};const canvasContext=new Proxy({createRadialGradient:()=>gradient,createLinearGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
  function node(){return{events:{},value:'',textContent:'',innerHTML:'',style:{},disabled:false,addEventListener(n,fn){this.events[n]=fn},removeEventListener(n,fn){if(this.events[n]===fn)delete this.events[n]},getContext:()=>canvasContext,getBoundingClientRect:()=>({left:0,top:0,width:720,height:440}),focus(){},setPointerCapture(){}}}
  const root={innerHTML:'',querySelector(s){if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);}};
  const env={window:{devicePixelRatio:1},requestAnimationFrame:fn=>(nextFrame=fn,++frameId),cancelAnimationFrame(){nextFrame=null},console,Math};vm.createContext(env);vm.runInContext(source,env);
  const cleanup=env.window.PromptGames[game]({root,stage,onComplete:r=>{result=r;completionCount++},onEvent:e=>events.push(e),sfx(){}});
  const click=selector=>{const n=root.querySelector(selector);assert.equal(typeof n.events.click,'function',selector+' has handler');n.events.click({});};
  const input=text=>root.querySelector('.game-command').value=text;
  const step=(count=1,action)=>{for(let i=0;i<count;i++){action?.();assert.equal(typeof nextFrame,'function','RAF scheduled');const callback=nextFrame;nextFrame=null;time+=16.7;callback(time);}};
  function finish(){assert.ok(result,`${game} stage ${stage+1} should complete`);assert.equal(completionCount,1);assert.ok(Number.isFinite(result.score));assert.ok(result.metrics&&Object.keys(result.metrics).length);assert.ok(events.some(e=>e.type==='run'));assert.ok(events.some(e=>e.type==='milestone'));assert.ok(events.some(e=>e.type==='hint'));assert.ok(events.some(e=>e.type==='error'));for(const e of events)assert.ok(['run','error','hint','milestone'].includes(e.type));step(30);assert.equal(completionCount,1,'completion is emitted once');click('[data-reset]');step();if(game==='catch'){assert.equal(env.window.catchProbe.running,false);assert.equal(env.window.catchProbe.orderIndex,0);assert.equal(env.window.catchProbe.items.length,0);}if(game==='defense'){assert.equal(env.window.defProbe.running,false);assert.equal(env.window.defProbe.wave,0);}if(game==='garden'){assert.equal(env.window.gardenProbe.paused,true);assert.equal(env.window.gardenProbe.goalIndex,0);assert.equal(env.window.gardenProbe.bumps,0);}cleanup();assert.equal(nextFrame,null);for(const n of nodes.values())assert.deepEqual(Object.keys(n.events),[],'event listeners cleaned');console.log(`${game} stage ${stage+1}: ${result.stars} stars, ${result.score} score`,JSON.stringify(result.metrics));return result;}
  return {env,root,click,input,step,events,finish,get result(){return result;}};
}
const catchCommands=[['collect cyan circles and amber diamonds'],['collect cyan squares and amber diamonds and coral stars'],['collect cyan circles and amber diamonds','collect coral stars and cyan squares']];
for(let stage=0;stage<3;stage++){
  const h=harness('catch',stage),canvas=h.root.querySelector('canvas');h.step(30);assert.equal(h.env.window.catchProbe.items.length,0,'catch awaits a user action');
  h.input('collect chartreuse pizzas');h.click('[data-apply]');assert.match(h.root.querySelector('.game-log').textContent,/Known colors/);h.click('[data-hint]');
  h.input(catchCommands[stage][0]);h.click('[data-apply]');h.click('[data-start]');h.step(20);h.click('[data-start]');h.step();const pausedCatch=JSON.stringify(h.env.window.catchProbe.items);h.step(30);assert.equal(JSON.stringify(h.env.window.catchProbe.items),pausedCatch,'catch pauses physics');h.click('[data-start]');canvas.events.pointerdown({clientX:360,clientY:390,pointerId:1});let applied=0;
  for(let frame=0;frame<9000&&!h.result;frame++){
    const p=h.env.window.catchProbe;if(p&&p.orderIndex!==applied){applied=p.orderIndex;h.input(catchCommands[stage][applied]);h.click('[data-apply]');h.click('[data-start]');}
    if(p){const target=p.items.filter(it=>it.y<393&&p.order.some(g=>g.color===it.color&&g.kind===it.kind&&(p.counts[g.color+' '+g.kind]||0)<g.need)).sort((a,b)=>b.y-a.y)[0];if(target)canvas.events.pointermove({clientX:target.x,clientY:390});}
    h.step();
  }
  const result=h.finish();assert.equal(result.stars,3);assert.equal(result.metrics.Delivered,stage===0?10:stage===1?11:15);
}
for(let stage=0;stage<3;stage++){
  const h=harness('defense',stage),canvas=h.root.querySelector('canvas');h.step(30);assert.equal(h.env.window.defProbe.enemies.length,0,'defense awaits a user action');
  h.input('target fastest; range 500');h.click('[data-apply]');assert.match(h.root.querySelector('.game-log').textContent,/between 90 and 200/);h.click('[data-start]');assert.match(h.root.querySelector('.game-log').textContent,/at least one tower/);h.click('[data-hint]');
  const placement=[{x:280,y:190},{x:315,y:390},{x:520,y:235},...(stage===2?[{x:580,y:76}]:[])];placement.forEach(p=>canvas.events.pointerdown({clientX:p.x,clientY:p.y}));
  const modes=stage===0?['rapid','rapid','rapid']:stage===1?['pierce','pierce','pierce','pierce']:['rapid','pierce','rapid','pierce','pierce'];
  const launch=wave=>{h.input(`target first; range 145; mode ${modes[wave-1]}`);h.click('[data-apply]');h.click('[data-start]');};launch(1);h.step(60);h.click('[data-start]');h.step();const pausedDefense=JSON.stringify(h.env.window.defProbe.enemies);h.step(30);assert.equal(JSON.stringify(h.env.window.defProbe.enemies),pausedDefense,'defense pauses physics');h.click('[data-start]');
  for(let frame=0;frame<60000&&!h.result;frame++){h.step();const text=h.root.querySelector('[data-start]').textContent,match=text.match(/^Launch wave (\d)$/);if(match)launch(Number(match[1]));if(h.env.window.defProbe.failed)break;}
  h.finish();
}
for(let stage=0;stage<3;stage++){
  const h=harness('garden',stage);h.step(30);assert.equal(h.env.window.gardenProbe.paused,true,'garden awaits a user action');
  h.input('gather at 999 100');h.click('[data-apply]');assert.match(h.root.querySelector('.game-log').textContent,/inside the field/);h.click('[data-hint]');
  function apply(command){h.input(command);h.click('[data-apply]');}
  let phase=0;apply(stage===0?'gather at 560 220; avoid hazards; spread 32':stage===1?'gather at 185 110; avoid hazards; spread 28; speed 55':'gather at 200 330; avoid hazards; spread 30; speed 65');h.step(30);h.click('[data-pause]');h.step();const pausedGarden=JSON.stringify(h.env.window.gardenProbe.drones);h.step(30);assert.equal(JSON.stringify(h.env.window.gardenProbe.drones),pausedGarden,'garden pauses physics');h.click('[data-pause]');
  for(let frame=0;frame<20000&&!h.result;frame++){
    h.step();const p=h.env.window.gardenProbe;
    if(stage===1&&phase===0&&p.drones.every((d,i)=>Math.hypot(d.x-(185+Math.cos(i/8*Math.PI*2)*28*1.15),d.y-(110+Math.sin(i/8*Math.PI*2)*28*1.15))<4)){phase=1;apply('gather at 595 110; avoid hazards; spread 28; speed 55');}
    if(stage===2&&p.goalIndex!==phase){phase=p.goalIndex;apply(phase===1?'gather at 530 330; avoid hazards; spread 30; speed 65':'gather at 600 110; avoid hazards; spread 28; speed 60');}
  }
  const result=h.finish();assert.equal(result.stars,3);assert.equal(result.metrics['Checkpoints reached'],stage===2?3:1);
}
console.log('PASS: nine stage playthroughs, explicit-input start, invalid-command feedback, hints/events, pause/retry, single completion, metrics, and RAF/listener cleanup.');
