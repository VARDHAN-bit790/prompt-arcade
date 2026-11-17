'use strict';
const path = require('node:path');
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map(),ev={},saved={'prompt-arcade-worlds-v2':JSON.stringify({results:{rover:{stars:2,score:300}},sound:false})};let cleanups=0,lastConfig;
function el(k){if(!nodes.has(k))nodes.set(k,{innerHTML:'',textContent:'',value:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},setAttribute(){},removeAttribute(){},querySelector:s=>el(k+s),querySelectorAll:()=>[],addEventListener:(n,f)=>ev[k+n]=f,showModal(){this.open=true},close(){this.open=false},focus(){},open:false,matches(){return false;}});return nodes.get(k);}
const games=Object.fromEntries(['rover','catch','bridge','garden','laser','factory','defense','escape'].map(id=>[id,c=>{lastConfig=c;return()=>cleanups++}]));
const context={document:{body:{classList:{toggle(){}}},querySelector:el,querySelectorAll:()=>[],addEventListener:(n,f)=>ev[n]=f},window:{PromptGames:games,addEventListener:(n,f)=>ev[n]=f,scrollTo(){}},localStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},location:{hash:'#arcade'},history:{replaceState(){}},setTimeout:()=>1,clearTimeout(){},console};vm.createContext(context);for(const f of ['progress.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', f),'utf8'),context);const run=s=>vm.runInContext(s,context);
assert.equal(run('totalStars()'),2);assert.ok(el('main').innerHTML.includes('24 MISSIONS'));
for(const id of Object.keys(games))for(let stage=0;stage<3;stage++){run(`playWorld('${id}',${stage})`);assert.equal(lastConfig.stage,stage);el('#game-root textarea').value='test command';lastConfig.onEvent({type:'run',message:'Executing instructions',command:'test command'});lastConfig.onComplete({stars:3,score:1000,lesson:'Goal reached',metrics:{moves:12}});lastConfig.onComplete({stars:1,score:10});assert.equal(el('#victory').open,true);}
assert.equal(run('totalStars()'),72);assert.equal(run('cleared()'),24);assert.equal(run('state.results["rover:0"].runs'),2);assert.equal(run('state.journal.filter(e=>e.type==="complete").length'),24);assert.equal(cleanups,23);
run("playWorld('bridge',1)");assert.equal(el('#game-root textarea').value,'test command');el('#game-root textarea').value='place steel at 1';run('saveCommand()');assert.equal(run('state.notebook.length'),1);run('saveCommand()');assert.equal(run('state.notebook.length'),1);
lastConfig.onEvent({type:'run',message:'Retry'});lastConfig.onComplete({stars:3,score:2200});assert.equal(run('state.results["bridge:1"].score'),2200);
el('#game-root textarea').value='inspect desk; take fuse; exit';lastConfig.onEvent({type:'milestone',message:'Exited',command:'exit'});assert.equal(run('state.drafts["bridge:1"]'),'inspect desk; take fuse; exit');
run("navigate('journal')");assert.ok(el('main').innerHTML.includes('place steel at 1'));run("navigate('progress')");assert.ok(el('main').innerHTML.includes('Perfect expedition'));run("navigate('guide')");assert.ok(el('main').innerHTML.includes('Architect'));
run("playWorld('rover',2)");const stale=lastConfig.onComplete;run("playWorld('laser',2)");const before=run('state.results["laser:2"].runs');stale({stars:3,score:100000});assert.equal(run('state.results["laser:2"].runs'),before);
const beforeClean=cleanups;ev.pagehide({persisted:true});assert.equal(cleanups,beforeClean);ev.pagehide({persisted:false});assert.equal(cleanups,beforeClean+1);assert.equal(Object.keys(JSON.parse(saved['prompt-arcade-expedition-v3']).results).length,24);
console.log('PASS shell: all24 stage mounts,events,completion guard,legacy migration,draft restore,notebook,journal,progress,guide,stale callbacks,bfcache cleanup.');
(async()=>{
 run("state.notes['rover:0']='';state.drafts['rover:0']='';");
 const input={version:3,results:{'rover:0':{stars:1,score:5}},notes:{'rover:0':'OLD NOTE'},drafts:{'rover:0':'OLD DRAFT'},journal:[{key:'rover:0',type:'hint',message:'Imported hint',command:'',at:'2026-11-17T12:00:00.000Z'}]};
 context.importFile={size:700,text:async()=>JSON.stringify(input)};await run('importProgress(importFile)');assert.equal(run("state.notes['rover:0']"),'');assert.equal(run("state.drafts['rover:0']"),'');assert.equal(run('totalStars()'),72);assert.equal(run("state.journal.some(e=>e.message==='Imported hint')"),true);
 run("playWorld('escape',2,'inspect desk; take wrench')");assert.equal(run("state.drafts['escape:2']"),'inspect desk; take wrench');
 run('navigate("journal")');const count=run('state.notebook.length');const click=props=>ev.click({target:{closest:()=>({dataset:{},hasAttribute:()=>false,...props})}});click({dataset:{removeNote:'0'}});assert.equal(run('state.notebook.length'),count-1);click({id:'undo-note'});assert.equal(run('state.notebook.length'),count);
 console.log('PASS backup/notes: best scores preserved,cleared text preserved,journal merged,loaded plan persisted,notebook remove+undo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
