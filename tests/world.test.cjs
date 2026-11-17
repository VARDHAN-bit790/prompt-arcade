'use strict';
const path = require('node:path');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let jobs=new Map(),nextID=0,now=0;
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(String(k).startsWith('create')?()=>gradient:()=>{}),set:(o,k,v)=>(o[k]=v,true)});
const context={window:{},requestAnimationFrame:fn=>{jobs.set(++nextID,fn);return nextID},cancelAnimationFrame:id=>jobs.delete(id)};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'games-world.js'),'utf8'),context);
const games=context.window.PromptGames;
function root(){const nodes=new Map();return{nodes,set innerHTML(v){this.markup=v;},get innerHTML(){return this.markup;},querySelector(s){if(!nodes.has(s))nodes.set(s,{value:'',textContent:'',innerHTML:'',dataset:{},disabled:false,hidden:false,events:{},addEventListener(k,f){this.events[k]=f},removeEventListener(k){delete this.events[k]},getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:720,height:440})});return nodes.get(s)}};}
function flush(limit=1500){for(let i=0;jobs.size&&i<limit;i++){now+=100;const batch=Array.from(jobs.entries());jobs.clear();for(const [,fn]of batch)fn(now);}assert.equal(jobs.size,0,'animation did not settle');}
const solutions={rover:['east 2; north 2; east 2; north 2; east 2; north 2','repeat 2 { east 3; north 3 }','east 6; north 2; west 6; north 2; east 6; north 2'],bridge:['place wood at 1, 2, 5, 6; place steel at 3, 4','place wood at 1, 3, 6; place steel at 2, 4, 5','place wood at 1, 6, 8; place steel at 2, 4; place carbon at 3, 5, 7'],laser:['rotate B clockwise; rotate D clockwise','rotate A clockwise; rotate C clockwise; rotate D clockwise','rotate A clockwise; rotate C clockwise; rotate D clockwise; rotate E clockwise']};
const rr=games.rover.rules;
assert.equal(rr.compile('repeat 2 { east 1; north 1 }').steps.length,4);
assert.equal(rr.compile('repeat 2 { east 1; north 1 }').blocks,3);
assert.equal(rr.compile('repeat 2 { repeat 2 { east 1 }; north 1 }').steps.length,6);
for(const bad of ['repeat { east 1 }','repeat 0 { east 1 }','repeat 2 east 1','repeat 2 { east 1','east 1 }','repeat 2 { }','east 99','teleport 2','repeat 8 { repeat 8 { north 7 } }'])assert.throws(()=>rr.compile(bad),undefined,bad);
for(let stage=0;stage<3;stage++){
  const cfg=rr.stages[stage],program=rr.compile(solutions.rover[stage]);let pos={...cfg.start};const found=new Set();
  assert(program.blocks<=cfg.memory);assert(program.steps.length<=cfg.energy);
  for(const command of program.steps){const r=rr.step(pos,command.dir,stage);assert(!r.blocked,`rover ${stage} blocked`);pos=r.next;if(cfg.cells.includes(`${pos.x},${pos.y}`))found.add(`${pos.x},${pos.y}`);}
  assert.equal(found.size,cfg.cells.length);assert.equal(pos.x,cfg.goal.x);assert.equal(pos.y,cfg.goal.y);assert.equal(program.steps.length,cfg.par);
  const queue=[{...cfg.start,mask:0,d:0}],seen=new Set();let shortest=null;
  for(let i=0;i<queue.length;i++){const p=queue[i],key=`${p.x},${p.y},${p.mask}`;if(seen.has(key))continue;seen.add(key);if(p.x===cfg.goal.x&&p.y===cfg.goal.y&&p.mask===(1<<cfg.cells.length)-1){shortest=p.d;break;}for(const dir of ['east','west','north','south']){const r=rr.step(p,dir,stage);if(!r.blocked){const cell=cfg.cells.indexOf(`${r.next.x},${r.next.y}`);queue.push({...r.next,mask:p.mask|(cell<0?0:1<<cell),d:p.d+1});}}}
  assert.equal(shortest,cfg.par,`rover ${stage} par not optimal`);
}
const br=games.bridge.rules;
for(let stage=0;stage<3;stage++){
 const cfg=br.stages[stage],plan=br.build(solutions.bridge[stage],Array(cfg.loads.length).fill(null),stage);assert.equal(br.cost(plan),cfg.par);assert(plan.every((m,i)=>br.materials[m].strength>=Math.max(cfg.loads[i],cfg.returnLoads?.[i]||0)));let optimal=Infinity;
 for(let mask=0;mask<cfg.available.length**cfg.loads.length;mask++){let n=mask,p=[];for(let i=0;i<cfg.loads.length;i++){p.push(cfg.available[n%cfg.available.length]);n=Math.floor(n/cfg.available.length);}if(p.filter(m=>m==='carbon').length>cfg.carbonLimit)continue;if(p.every((m,i)=>br.materials[m].strength>=Math.max(cfg.loads[i],cfg.returnLoads?.[i]||0)))optimal=Math.min(optimal,br.cost(p));}
 assert.equal(optimal,cfg.par);assert.throws(()=>br.build(`place steel at ${cfg.loads.length+1}`,plan,stage));
}
assert.throws(()=>br.build('place carbon at 1',Array(6).fill(null),0));assert.throws(()=>br.build('place carbon at 1,2,3,4',Array(8).fill(null),2));assert.throws(()=>br.build('place steel at 1,2,3,4,5,6',Array(6).fill(null),0));
const lr=games.laser.rules;
for(let stage=0;stage<3;stage++){
 const cfg=lr.stages[stage],names=Object.keys(cfg.positions),fixed=lr.rotate(solutions.laser[stage],cfg.initial,stage);assert(!lr.trace(cfg.initial,stage).success);assert(lr.trace(fixed,stage).success);let wins=0,minTurns=Infinity;
 for(let mask=0;mask<2**names.length;mask++){const mirrors={};names.forEach((n,i)=>mirrors[n]=(mask&(1<<i))?'/':'\\');if(lr.trace(mirrors,stage).success){wins++;minTurns=Math.min(minTurns,names.filter(n=>mirrors[n]!==cfg.initial[n]).length);}}
 assert.equal(wins,1,`laser ${stage} must have unique orientation solution`);assert.equal(minTurns,cfg.par);assert.throws(()=>lr.rotate('rotate Z clockwise',cfg.initial,stage));
}
console.log('PASS v3 rules: repeat parser and errors; all rover routes + optimal lengths; bridge resource limits + optimal costs; all unique laser solutions + minimum turns.');
for(const name of ['rover','bridge','laser'])for(let stage=0;stage<3;stage++){
 const r=root(),won=[],events=[],sounds=[];const destroy=games[name]({root:r,stage,onComplete:result=>won.push(result),onEvent:event=>events.push(event),sfx:key=>sounds.push(key)});
 r.querySelector('[data-hint]').events.click();assert(events.some(e=>e.type==='hint'));
 r.querySelector('.game-command').value=solutions[name][stage];const buildSelector={rover:'[data-run]',bridge:'[data-build]',laser:'[data-rotate]'}[name];r.querySelector(buildSelector).events.click();if(name!=='rover')r.querySelector(name==='bridge'?'[data-test]':'[data-fire]').events.click();flush();
 assert.equal(won.length,1,`${name} ${stage} completion count`);assert.equal(won[0].stars,3,`${name} ${stage} stars`);assert(won[0].metrics);assert.equal(won[0].metrics['Hints viewed'],1);assert(events.some(e=>e.type==='run'));assert(events.some(e=>e.type==='milestone'));assert(!events.some(e=>e.type==='error'));assert(sounds.includes('win'));if(name==='bridge'&&stage===2)assert.equal(won[0].metrics['Crossings passed'],2);if(name==='rover')assert(r.querySelector('[data-trace]').innerHTML.includes('column'));
 destroy();assert.equal(jobs.size,0);for(const node of r.nodes.values())assert.equal(Object.keys(node.events).length,0,'event listener leaked');console.log(`PASS v3 lifecycle: ${name} stage ${stage+1} · win, metrics, event stream, animation, cleanup.`);
}
// Invalid programs must not start a run or award a win.
for(const name of ['rover','bridge','laser']){const r=root(),events=[],wins=[];const destroy=games[name]({root:r,stage:1,onComplete:x=>wins.push(x),onEvent:x=>events.push(x)});r.querySelector('.game-command').value=name==='rover'?'east 3; north 3; east 3; north 3':'nonsense';r.querySelector({rover:'[data-run]',bridge:'[data-build]',laser:'[data-rotate]'}[name]).events.click();assert.equal(wins.length,0);assert(events.some(e=>e.type==='error'));assert(!events.some(e=>e.type==='run'));assert.equal(jobs.size,0);destroy();}
// Leaving during an animation must cancel all work and avoid a late completion.
for(const name of ['rover','bridge','laser']){const r=root(),wins=[];const destroy=games[name]({root:r,stage:2,onComplete:x=>wins.push(x)});r.querySelector('.game-command').value=solutions[name][2];r.querySelector({rover:'[data-run]',bridge:'[data-build]',laser:'[data-rotate]'}[name]).events.click();if(name!=='rover')r.querySelector(name==='bridge'?'[data-test]':'[data-fire]').events.click();assert(jobs.size>0);destroy();flush();assert.equal(wins.length,0);}
console.log('PASS v3 failures and interruption: invalid commands/memory limits reject safely; all animations cancel when leaving.');
