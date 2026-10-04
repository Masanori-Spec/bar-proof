import {VERSION,LIMITS,fail} from './limits.mjs';
import {Q,ZERO,positive,str} from './rational.mjs';
import {parseXML,kids,child,value,fragment,rejectNamespaces} from './xml.mjs';
export {VERSION,LIMITS};
const COUNTABLE=new Set(['note','backup','forward']);
const boundedText=(s,limit)=>{if(s.length>limit)fail('metadata-limit');return s;};
const KNOWN=new Set(['attributes','note','backup','forward','direction','harmony','figured-bass','print','sound','listening','barline','grouping','link','bookmark']);
function meter(time){
 if(time.attrs.number||child(time,'senza-misura')||child(time,'interchangeable'))return null;
 const c=time.children.filter(n=>n.name==='beats'||n.name==='beat-type');if(!c.length||c.length%2)return null;if(c.length/2>LIMITS.meterPairs)fail('meter-limit');let q=ZERO,terms=0;
 for(let i=0;i<c.length;i+=2){if(c[i].text.length+c[i+1].text.length>LIMITS.meterTextChars)fail('meter-limit');if(c[i].name!=='beats'||c[i+1].name!=='beat-type'||!/^\d+(\s*\+\s*\d+)*$/.test(c[i].text.trim())||!/^\d+$/.test(c[i+1].text.trim()))return null;const parts=c[i].text.split('+');terms+=parts.length;if(terms>LIMITS.meterTerms)fail('meter-limit');try{const denom=positive(c[i+1].text);for(const term of parts){q=q.add(positive(term).div(denom));if(q.n.toString().length>LIMITS.meterFractionDigits||q.d.toString().length>LIMITS.meterFractionDigits)fail('meter-limit');}}catch(e){if(e.code==='rational-limit'||e.code==='meter-limit')fail('meter-limit');return null;}}
 return new Q(q.n*4n,q.d);
}
export function inspectScore(xml){
 const parsed=parseXML(xml),root=parsed.root;rejectNamespaces(root);if(root.name!=='score-partwise')fail('score-type');const partNodes=kids(root,'part');if(!partNodes.length||partNodes.length>LIMITS.parts)fail('part-limit');const names=new Map();for(const n of child(root,'part-list')?.children??[]){if(n.name==='score-part'){if(names.has(n.attrs.id))fail('part-id');names.set(boundedText(n.attrs.id??'',LIMITS.partIdChars),boundedText(value(n,'part-name'),LIMITS.partNameChars));}}
 let totalMeasures=0,totalEvents=0,totalFindings=0;const parts=[],seenIds=new Set();
 for(const [pi,p] of partNodes.entries()){
  if(!p.attrs.id||seenIds.has(p.attrs.id))fail('part-id');boundedText(p.attrs.id,LIMITS.partIdChars);seenIds.add(p.attrs.id);let divisions=null,meterValue=null,divBlocked=false,timeBlocked=false;const part={id:p.attrs.id,name:names.get(p.attrs.id)||p.attrs.id,ordinal:pi+1,measures:[]};
  for(const [mi,m] of kids(p,'measure').entries()){
   if(++totalMeasures>LIMITS.measures)fail('measure-limit');if(m.children.length>LIMITS.measureChildren)fail('measure-child-limit');const ordinals=new Map(m.children.map((n,i)=>[n,i+1]));const r={ordinal:mi+1,label:boundedText(m.attrs.number??'',LIMITS.measureLabelChars),implicit:m.attrs.implicit==='yes',nonControlling:m.attrs['non-controlling']==='yes',expected:null,cursor:null,extent:null,divisions:null,events:[],findings:[],status:'clear'};let eventOrdinal=0;
   const add=(code,severity,node=m,event=0,detail={})=>{if(++totalFindings>LIMITS.findings||r.findings.length>=LIMITS.findingsPerMeasure)fail('finding-limit');r.findings.push({code,severity,partId:part.id,partOrdinal:part.ordinal,measureLabel:r.label,measureOrdinal:r.ordinal,eventOrdinal:event,sourceChildOrdinal:ordinals.get(node)??0,fragment:fragment(xml,node),fragmentTruncated:node.end-node.start>LIMITS.fragmentChars,...detail});};
   let encountered=false,lateDiv=false,lateTime=false,initialDiv=divisions,initialTime=meterValue;
   for(const n of m.children){if(COUNTABLE.has(n.name))encountered=true;if(n.name!=='attributes')continue;const ds=kids(n,'divisions'),ts=kids(n,'time');
    if(ds.length){if(encountered){lateDiv=true;divBlocked=true;divisions=null;add('unsupported-midmeasure-divisions','unsupported',n);}else{try{if(ds.length!==1)throw Error();divisions=positive(ds[0].text);divBlocked=false;}catch{divisions=null;divBlocked=true;add('invalid-divisions','unsupported',n);}initialDiv=divisions;}}
    if(ts.length){if(encountered){lateTime=true;timeBlocked=true;meterValue=null;add('unsupported-midmeasure-time','unsupported',n);}else{let limitExceeded=false;try{meterValue=ts.length===1?meter(ts[0]):null;}catch(e){if(e.code!=='meter-limit')throw e;meterValue=null;limitExceeded=true;}timeBlocked=!meterValue;if(!meterValue)add(limitExceeded?'unsupported-time-limit':ts.some(t=>t.attrs.number)?'unsupported-staff-time':'unsupported-time','unsupported',n);initialTime=meterValue;}}
   }
   if(lateDiv){divisions=null;initialDiv=null;divBlocked=true;}if(lateTime){meterValue=null;initialTime=null;timeBlocked=true;}
   if(!initialDiv&&!r.findings.some(f=>f.code.includes('divisions')))add(divBlocked?'unsupported-inherited-divisions':'missing-divisions','unsupported');
   if(!initialTime&&!r.findings.some(f=>f.code.includes('time')))add(timeBlocked?'unsupported-inherited-time':'missing-time','unsupported');
   r.divisions=str(initialDiv);r.expected=str(initialTime);let cursor=initialDiv?ZERO:null,extent=initialDiv?ZERO:null,lead=null,unreliable=false;
   for(const n of m.children){if(!KNOWN.has(n.name)){add('unsupported-element','unsupported',n,0,{element:n.name});unreliable=true;}if(!COUNTABLE.has(n.name))continue;
    if(++totalEvents>LIMITS.events||++eventOrdinal>LIMITS.eventsPerMeasure)fail('event-limit');const grace=n.name==='note'&&!!child(n,'grace'),chord=n.name==='note'&&!!child(n,'chord');const encodedVoice=boundedText(value(n,'voice'),LIMITS.voiceStaffChars)||null,voice=encodedVoice||(chord?lead?.encodedVoice:null)||'?',staff=boundedText(value(n,'staff'),LIMITS.voiceStaffChars)||'1';const kind=n.name!=='note'?n.name:grace?(chord?'grace-chord':'grace'):chord?'chord':child(n,'rest')?'rest':child(n,'cue')?'cue':'note';
    const ds=kids(n,'duration');if(['grace','chord','voice','staff','rest','cue'].some(k=>kids(n,k).length>1)||(child(n,'rest')&&(child(n,'pitch')||child(n,'unpitched')||chord))){add('ambiguous-event','unsupported',n,eventOrdinal);unreliable=true;}let duration=null;if(grace){duration=ZERO;if(ds.length)add('grace-duration','review',n,eventOrdinal);}else{try{if(ds.length!==1)throw Error();const raw=positive(ds[0].text);if(initialDiv)duration=raw.div(initialDiv);}catch{add('invalid-duration','unsupported',n,eventOrdinal);unreliable=true;}}
    let start=cursor,end=null;
    if(chord){if(!lead||lead.grace!==grace){add('orphan-chord','review',n,eventOrdinal);start=null;unreliable=true;}else{start=lead.start;if(duration&&lead.duration&&duration.cmp(lead.duration)>0)add('chord-too-long','review',n,eventOrdinal,{actual:str(duration),limit:str(lead.duration)});}end=start&&duration?start.add(duration):null;}
    else if(n.name==='backup'){end=cursor&&duration?cursor.sub(duration):null;cursor=end;lead=null;if(cursor&&cursor.cmp(ZERO)<0)add('before-zero','review',n,eventOrdinal,{actual:str(cursor)});}
    else{end=cursor&&duration?cursor.add(duration):null;cursor=end;if(n.name==='note')lead={start,duration,voice,encodedVoice,staff,grace};else lead=null;}
    if(n.name!=='backup'&&end&&extent&&end.cmp(extent)>0)extent=end;if(duration===null||start===null||end===null)unreliable=true;
    r.events.push({ordinal:eventOrdinal,sourceChildOrdinal:ordinals.get(n),kind,voice,encodedVoice,voiceSource:encodedVoice?'encoded':chord&&lead?.encodedVoice?'anchor':'unspecified',staff,start:str(start),end:str(end),duration:str(duration),encodedDuration:ds[0]?.text.trim()??null,divisions:r.divisions,tuplet:!!child(n,'time-modification'),fragment:fragment(xml,n),fragmentTruncated:n.end-n.start>LIMITS.fragmentChars});
   }
   if(!r.events.length)add('empty-measure','review');
   r.cursor=unreliable?null:str(cursor);r.extent=unreliable?null:str(extent);
   if(r.implicit)add('implicit-pickup','info');if(r.nonControlling)add('non-controlling','info');
   if(extent&&initialTime&&!unreliable&&!r.implicit&&!r.nonControlling){const c=extent.cmp(initialTime);if(c)add(c<0?'underfull':'overfull','review',m,0,{actual:str(extent),expected:str(initialTime),difference:str(extent.sub(initialTime))});}
   if(unreliable&&!r.findings.some(f=>f.severity==='unsupported'))add('incomplete-timeline','unsupported');
   r.status=r.findings.some(f=>f.severity==='unsupported')?'unsupported':r.findings.length?'review':'clear';part.measures.push(r);
  }
  if(!part.measures.length)fail('measure-limit');parts.push(part);
 }
 return {schema:'barproof.review.v1',engineVersion:VERSION,unit:'quarter-note',limits:LIMITS,externalDoctypeIgnored:parsed.externalDoctypeIgnored,parts,counts:{parts:parts.length,measures:totalMeasures,events:totalEvents,findings:parts.flatMap(p=>p.measures).reduce((a,m)=>a+m.findings.length,0)}};
}
