(function(){
'use strict';
const ids=['rover','catch','bridge','garden','laser','factory','defense','escape'];
const key='prompt-arcade-expedition-v3';
const validKey=k=>typeof k==='string'&&ids.some(id=>[0,1,2].some(s=>k===id+':'+s));
function empty(){return{version:3,results:{},drafts:{},notes:{},notebook:[],journal:[],sound:false,last:null};}
function clean(raw){const s=empty();if(!raw||typeof raw!=='object')return s;s.sound=raw.sound===true;
for(const [k,r] of Object.entries(raw.results||{})){const next=ids.includes(k)?k+':0':k;if(!validKey(next)||!r||!Number.isFinite(r.stars)||r.stars<1)continue;s.results[next]={stars:Math.min(3,Math.round(r.stars)),score:Number.isFinite(r.score)?Math.max(0,Math.min(1e9,Math.round(r.score))):0,runs:Number.isFinite(r.runs)?Math.max(1,Math.round(r.runs)):1,metrics:r.metrics&&typeof r.metrics==='object'?Object.fromEntries(Object.entries(r.metrics).slice(0,8).filter(([a,v])=>a.length<80&&['string','number'].includes(typeof v)).map(([a,v])=>[a,String(v).slice(0,100)])):{}};}
for(const field of ['drafts','notes'])for(const [k,v] of Object.entries(raw[field]||{}))if(validKey(k)&&typeof v==='string')s[field][k]=v.slice(0,field==='drafts'?8000:1200);
if(Array.isArray(raw.notebook))s.notebook=raw.notebook.filter(x=>x&&validKey(x.key)&&typeof x.command==='string'&&typeof x.id==='string').slice(0,30).map(x=>({key:x.key,command:x.command.slice(0,8000),id:x.id.slice(0,80),at:typeof x.at==='string'?x.at.slice(0,50):''}));
if(Array.isArray(raw.journal))s.journal=raw.journal.filter(x=>x&&validKey(x.key)&&['run','error','hint','milestone','complete'].includes(x.type)&&typeof x.message==='string').slice(0,100).map(x=>({key:x.key,type:x.type,message:x.message.slice(0,600),command:typeof x.command==='string'?x.command.slice(0,8000):'',at:typeof x.at==='string'?x.at.slice(0,50):''}));
if(validKey(raw.last))s.last=raw.last;return s;}
function read(storage){try{const current=storage.getItem(key);const old=current||storage.getItem('prompt-arcade-worlds-v2');return{state:clean(old?JSON.parse(old):null),persistent:true};}catch{return{state:empty(),persistent:false};}}
function record(state,mission,result){if(!validKey(mission))return;const old=state.results[mission];const n=Number(result.stars),q=Number(result.score);state.results[mission]={stars:Math.max(old?.stars||0,Number.isFinite(n)?Math.max(1,Math.min(3,Math.round(n))):1),score:Math.max(old?.score||0,Number.isFinite(q)?Math.max(0,Math.min(1e9,Math.round(q))):0),runs:(old?.runs||0)+1,metrics:result.metrics&&typeof result.metrics==='object'?Object.fromEntries(Object.entries(result.metrics).slice(0,8).filter(([a,v])=>a.length<80&&['string','number'].includes(typeof v)).map(([a,v])=>[a,String(v).slice(0,100)])):{}};}
window.PromptProgress={key,ids,validKey,empty,clean,read,record};
})();
