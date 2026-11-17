'use strict';
const path = require('node:path');
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let nextId=0,frames=new Map(),time=0;
const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
function node(){return {textContent:'',innerHTML:'',value:'',disabled:false,dataset:{},listeners:{},addEventListener(k,f){this.listeners[k]=f},removeEventListener(k){delete this.listeners[k]},focus(){},getContext(){return ctx},getBoundingClientRect(){return {left:0,top:0,width:720,height:440}}};}
function root(){const map=new Map(),objects=['desk','generator','terminal','vault','door','relay','coolant'].map(key=>{const n=node();n.dataset.object=key;return n});return {innerHTML:'',map,objects,querySelector(k){if(!map.has(k))map.set(k,node());return map.get(k)},querySelectorAll(){return objects}};}
const context={window:{},requestAnimationFrame(fn){const id=++nextId;frames.set(id,fn);return id},cancelAnimationFrame(id){frames.delete(id)}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'games-puzzles.js'),'utf8'),context);
const games=context.window.PromptGames,f=games.factory.test,e=games.escape.test;
function advance(seconds){for(let i=0;i<Math.ceil(seconds*60);i++){time+=1000/60;const fns=[...frames.values()];frames.clear();fns.forEach(fn=>fn(time));}}
function click(root,selector){const b=root.querySelector(selector);assert.equal(typeof b.listeners.click,'function');b.listeners.click();}
const factoryPrograms=[
 ['if red -> dock A; if blue -> dock B','if triangle -> recycle; if red -> dock A; if blue -> dock B','if green square -> dock C; if triangle -> recycle; if green -> recycle; if red -> dock A; if blue -> dock B'],
 ['if fragile -> dock C; if red -> dock A; if blue -> dock B; otherwise -> recycle','if fragile -> dock C; if express -> dock B; if weight >= 4 -> dock A; otherwise -> recycle','if green and weight >= 4 -> dock C; if fragile -> recycle; if express -> dock B; otherwise -> dock A'],
 ['if fragile express -> dock C; if fragile -> recycle; if weight >= 5 -> dock A; if express -> dock B; otherwise -> recycle','if green square express -> dock C; if triangle weight >= 3 -> recycle; if fragile -> dock B; if weight <= 2 -> dock A; otherwise -> dock C','if red fragile weight >= 4 -> recycle; if express not fragile -> dock C; if blue circle -> dock B; if weight >= 5 -> dock A; otherwise -> recycle']
];
for(let stage=0;stage<3;stage++)for(let contract=0;contract<3;contract++){const rules=f.parseRules(factoryPrograms[stage][contract]);for(const p of f.stages[stage][contract].items)assert.equal(f.routeItem(rules,p),f.stages[stage][contract].expected(p),`stage ${stage}, contract ${contract}: ${JSON.stringify(p)}`);}
assert.equal(f.routeItem(f.parseRules('if fragile -> dock A; if fragile express -> dock C'),{fragile:true,express:true}),'A');
assert.equal(f.routeItem(f.parseRules('if not express and weight < 3 -> dock B'),{express:false,weight:2}),'B');
assert.equal(f.routeItem(f.parseRules('if blue -> dock B'),{color:'red',shape:'square'}),'R');
for(const invalid of ['',null,'red -> A','if banana -> A','if red blue -> A','if red -> moon','if fragile not fragile -> A','if weight >= 10 -> A','if weight >= -1 -> A','if weight >= 2.5 -> A','if weight >= 2 weight <= 5 -> A','x'.repeat(2401),Array(17).fill('if red -> A').join(';')])assert.throws(()=>f.parseRules(invalid),String(invalid).slice(0,100));
for(const stage of [0,1,2]){
 const fr=root(),events=[];let won=0,result;const clean=games.factory({root:fr,stage,onEvent:v=>events.push(v),onComplete:v=>{won++;result=v;}});
 fr.querySelector('textarea').value='if banana -> nowhere';click(fr,'.game-run');assert.equal(events.at(-1).type,'error');
 for(let c=0;c<3;c++){fr.querySelector('textarea').value=factoryPrograms[stage][c];click(fr,'.game-run');advance(18);if(c<2)click(fr,'.game-run');}
 assert.equal(won,1,`factory stage ${stage}`);assert.equal(result.metrics.Contracts,3);assert.equal(result.metrics.Misroutes,0);assert.equal(events.filter(v=>v.type==='run').length,3);assert.equal(events.filter(v=>v.type==='milestone').length,3);advance(3);assert.equal(won,1);clean();const n=events.length;advance(1);assert.equal(events.length,n);assert.equal(frames.size,0);assert.equal(fr.querySelector('.game-run').listeners.click,undefined);
}
const escapePlans=[
 'inspect desk; take fuse; install fuse in generator; inspect terminal; unlock vault with 314; take keycard; cycle airlock; use keycard on door; exit',
 'inspect desk; take fuse; take probe; install fuse in generator; inspect generator; repair relay with probe; tune relay to 2; inspect terminal; unlock vault with 627; take keycard; cycle airlock; use keycard on door; exit',
 'inspect desk; take fuse; take wrench; install fuse in generator; inspect coolant; open coolant valve with wrench; inspect terminal; unlock vault with 859; take keycard; take relay chip; install chip in relay; tune relay to 3; cycle airlock; use keycard on door; exit'
];
for(let stage=0;stage<3;stage++){
 const s=e.createState(stage);assert.equal(e.action(s,'exit').ok,false);assert.equal(e.action(s,'open door').ok,false);for(const action of e.parsePlan(escapePlans[stage])){const r=e.action(s,action);assert.equal(r.ok,true,`stage ${stage}, ${action}: ${r.text}`);}assert.equal(s.escaped,true);assert.equal(s.doorOpen,true);
 const er=root(),events=[];let won=0,result;const clean=games.escape({root:er,stage,onEvent:v=>events.push(v),onComplete:v=>{won++;result=v;}});er.querySelector('textarea').value=escapePlans[stage];click(er,'.game-run');advance(40);assert.equal(won,1,`escape stage ${stage}`);assert.equal(er.querySelector('[data-stat="airlock"]').textContent,'OPEN');assert.equal(result.metrics.Errors,0);assert.equal(events.filter(v=>v.type==='run').length,1);assert(events.some(v=>v.type==='milestone'&&v.message.includes('escaped')));advance(3);assert.equal(won,1);clean();const n=events.length;advance(1);assert.equal(events.length,n);assert.equal(frames.size,0);for(const button of er.objects)assert.equal(button.listeners.click,undefined);
}
// Every advanced dependency prevents skipping the physical world state.
const relay=e.createState(1);for(const a of ['inspect desk','take fuse','install fuse'])assert.equal(e.action(relay,a).ok,true);assert(!e.action(relay,'inspect terminal').text.includes('627'));assert.equal(e.action(relay,'unlock vault with 627').ok,false);assert.equal(e.action(relay,'tune relay to 2').ok,false);assert.equal(e.action(relay,'repair relay with probe').ok,false);for(const a of ['take probe','repair relay with probe'])assert.equal(e.action(relay,a).ok,true);assert.equal(e.action(relay,'tune relay to 3').ok,false);assert.equal(e.action(relay,'tune relay to 2').ok,true);assert(e.action(relay,'inspect terminal').text.includes('627'));
const thermal=e.createState(2);for(const a of ['inspect desk','take fuse','install fuse'])assert.equal(e.action(thermal,a).ok,true);assert.equal(thermal.powered,false);assert.equal(e.action(thermal,'open coolant valve with wrench').ok,false);for(const a of ['take wrench','open coolant valve with wrench'])assert.equal(e.action(thermal,a).ok,true);assert.equal(thermal.powered,true);assert.equal(e.action(thermal,'install chip in relay').ok,false);assert.equal(e.action(thermal,'cycle airlock').ok,false);assert(e.action(thermal,'inspect terminal').text.includes('859'));
for(const invalid of ['',null,'x'.repeat(2401),Array(25).fill('inspect desk').join(';'),'x'.repeat(161)])assert.throws(()=>e.parsePlan(invalid));assert.equal(e.action(e.createState(),'x'.repeat(161)).ok,false);
// Paused factory does not advance; reset preserves instruction draft and releases the run button.
const paused=root();const cleanP=games.factory({root:paused,stage:1,onComplete:()=>assert.fail('early win')});paused.querySelector('textarea').value=factoryPrograms[1][0];click(paused,'.game-run');click(paused,'.puzzle-pause');advance(20);assert.equal(paused.querySelector('[data-stat="delivered"]').textContent,'0 / 8');click(paused,'.game-reset');assert.equal(paused.querySelector('textarea').value,factoryPrograms[1][0]);cleanP();
// A failed action stops a plan, preserves prior successful state, and emits one error.
const blocked=root(),blockedEvents=[];const cleanB=games.escape({root:blocked,stage:2,onEvent:v=>blockedEvents.push(v),onComplete:()=>assert.fail('blocked plan escaped')});blocked.querySelector('textarea').value='inspect desk; take fuse; install fuse; cycle airlock; take wrench';click(blocked,'.game-run');advance(15);assert.equal(blocked.querySelector('[data-stat="power"]').textContent,'STANDBY');assert.equal(blocked.querySelector('[data-stat="actions"]').textContent,'4');assert.equal(blockedEvents.filter(v=>v.type==='error').length,1);click(blocked,'[data-hint]');assert.equal(blockedEvents.at(-1).type,'hint');cleanB();
assert.equal(frames.size,0);
console.log('PASS: all 9 factory manifests, all 6 mounted/animated stage completions, trait comparisons and first-match priority, parser limits, advanced escape evidence/dependencies, event callbacks, pause/reset, failed-plan stop, RAF/listener cleanup.');
