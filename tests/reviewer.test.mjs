import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { inspectScore } from '../src/core.mjs';
import { reportHTML } from '../src/report.mjs';
import { readInput } from '../src/import.mjs';
import { archive, container } from './helpers.mjs';

// Expected positions below are literal, independently calculated witnesses.
const pitch='<pitch><step>C</step><octave>4</octave></pitch>';
const n=(duration,extra='',voice='1',staff='1')=>`<note>${extra}${pitch}${duration===null?'':`<duration>${duration}</duration>`}${voice===null?'':`<voice>${voice}</voice>`}${staff===null?'':`<staff>${staff}</staff>`}</note>`;
const attrs=(divisions='12',time='<beats>4</beats><beat-type>4</beat-type>')=>`<attributes>${divisions===null?'':`<divisions>${divisions}</divisions>`}${time===null?'':`<time>${time}</time>`}</attributes>`;
const measure=(body,other='')=>`<measure number="A" ${other}>${body}</measure>`;
const score=(...measures)=>`<score-partwise version="4.0"><part-list><score-part id="P"><part-name>Review</part-name></score-part></part-list><part id="P">${measures.join('')}</part></score-partwise>`;
const first=xml=>inspectScore(xml).parts[0].measures[0];
const codes=m=>m.findings.map(f=>f.code);
const positions=m=>m.events.map(e=>[e.kind,e.start,e.end,e.duration]);

test('review: voice annotations cannot manufacture an orphan chord',()=>{
  for(const voices of [['2',null],[null,'2'],[null,null],['2','3']]){
    const m=first(score(measure(attrs()+n('48','',voices[0])+n('48','<chord/>',voices[1]))));
    assert.equal(m.extent,'4',JSON.stringify({voices,findings:m.findings}));
    assert.equal(m.cursor,'4');assert.ok(!codes(m).includes('orphan-chord'));
    assert.equal(m.events[1].start,'0');assert.equal(m.events[1].encodedVoice,voices[1]);
  }
});

test('review: cross-staff chord and shorter members retain original non-chord anchor',()=>{
  const m=first(score(measure(attrs()+n('24','', '1','1')+n('12','<chord/>','1','2')+n('6','<chord/>','1','1')+n('24'))));
  assert.deepEqual(positions(m),[['note','0','2','2'],['chord','0','1','1'],['chord','0','1/2','1/2'],['note','2','4','2']]);
  assert.equal(m.status,'clear');
});

test('review: grace chord group contributes zero and does not displace following regular onset',()=>{
  const m=first(score(measure(attrs()+n(null,'<grace/>')+n(null,'<grace/><chord/>')+n('24')+n(null,'<grace/>')+n('24'))));
  assert.deepEqual(positions(m),[['grace','0','0','0'],['grace-chord','0','0','0'],['note','0','2','2'],['grace','2','2','0'],['note','2','4','2']]);
  assert.equal(m.extent,'4');assert.equal(m.status,'clear');
});

test('review: decimal divisions, tuplets and dotted notation never double-scale encoded time',()=>{
  const body=Array.from({length:12},()=>n('.3','<type>whole</type><dot/><time-modification><actual-notes>17</actual-notes><normal-notes>19</normal-notes></time-modification>')).join('');
  const m=first(score(measure(attrs('.9')+body)));
  assert.equal(m.events[0].duration,'1/3');assert.equal(m.events[10].start,'10/3');assert.equal(m.events[11].end,'4');assert.equal(m.status,'clear');
});

test('review: backup/forward distinguish maximum extent from final cursor',()=>{
  const m=first(score(measure(attrs()+n('48')+'<backup><duration>48</duration></backup><forward><duration>12</duration><voice>2</voice></forward>'+n('12','','2'))));
  assert.deepEqual(positions(m),[['note','0','4','4'],['backup','4','0','4'],['forward','0','1','1'],['note','1','2','1']]);
  assert.equal(m.extent,'4');assert.equal(m.cursor,'2');assert.equal(m.status,'clear');
});

test('review: a forward overrun remains visible after a compensating backup',()=>{
  const m=first(score(measure(attrs()+'<forward><duration>60</duration></forward><backup><duration>12</duration></backup>')));
  assert.equal(m.extent,'5');assert.equal(m.cursor,'4');assert.ok(codes(m).includes('overfull'));
});

test('review: unsupported meter inheritance persists until a supported boundary restores it',()=>{
  const r=inspectScore(score(measure(attrs()+n('48')),measure(attrs(null,'<senza-misura/>')+n('48')),measure(n('48')),measure(attrs(null,'<beats>3</beats><beat-type>4</beat-type>')+n('36')))).parts[0].measures;
  assert.deepEqual(r.map(m=>m.expected),['4',null,null,'3']);assert.deepEqual(r.map(m=>m.extent),['4','4','4','3']);
  assert.equal(r[2].status,'unsupported');assert.ok(codes(r[2]).includes('unsupported-inherited-time'));assert.equal(r[3].status,'clear');
});

test('review: late divisions make the whole measure and inherited timeline unknown until reset',()=>{
  const r=inspectScore(score(measure(attrs()+n('12')+attrs('24',null)+n('72')),measure(n('96')),measure(attrs('24',null)+n('96')))).parts[0].measures;
  assert.deepEqual(r.map(m=>m.extent),[null,null,'4']);assert.deepEqual(r.map(m=>m.divisions),[null,null,'24']);
  assert.ok(codes(r[0]).includes('unsupported-midmeasure-divisions'));assert.ok(codes(r[1]).includes('unsupported-inherited-divisions'));assert.equal(r[2].status,'clear');
});

test('review: ordinary, implicit and non-controlling bars preserve extent but differ in comparison policy',()=>{
  const rs=['','implicit="yes"','non-controlling="yes"'].map(a=>first(score(measure(attrs()+n('12'),a))));
  assert.deepEqual(rs.map(m=>m.extent),['1','1','1']);assert.ok(codes(rs[0]).includes('underfull'));
  for(const r of rs.slice(1))assert.ok(!codes(r).includes('underfull'));
});

test('review: unknown measure timing data cannot receive a complete-timeline verdict',()=>{
  const m=first(score(measure(attrs()+n('48')+'<future-timing value="1"/>')));
  assert.equal(m.status,'unsupported');assert.equal(m.extent,null);assert.equal(m.cursor,null);
});

test('review: derived composite fractions are bounded even for small valid XML',()=>{
  const pairs=Array.from({length:1500},(_,i)=>`<beats>1</beats><beat-type>${1000000007+i*2}</beat-type>`).join('');
  const xml=score(measure(attrs('1',pairs)+n('1')));
  const script=`import {inspectScore} from './src/core.mjs';try{const m=inspectScore(${JSON.stringify(xml)}).parts[0].measures[0];console.log(JSON.stringify({status:m.status,expected:m.expected}));}catch(e){console.log(JSON.stringify({boundedError:e.code}));}`;
  const run=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:2000,maxBuffer:100_000});
  assert.ok(!run.error,`Composite meter did not fail boundedly: ${run.error?.code}`);assert.equal(run.status,0,run.stderr);
  const answer=JSON.parse(run.stdout);assert.ok(answer.boundedError||answer.status==='unsupported');assert.ok(answer.expected===undefined||answer.expected===null);
});

test('review: MXL first-root selection ignores later root and executable-looking unused asset',async()=>{
  const good=score(measure(attrs()+n('48'))),bad='<broken>';
  const c='<container><rootfiles><rootfile full-path="score.xml"/><rootfile full-path="later.xml"/></rootfiles></container>';
  const imported=await readInput(archive([['META-INF/container.xml',c],['score.xml',good],['later.xml',bad],['unused.svg','<svg onload="alert(1)"/>']]),'review.mxl');
  assert.equal(imported.xml,good);assert.equal(imported.input.archivePath,'score.xml');assert.equal(inspectScore(imported.xml).parts[0].measures[0].status,'clear');
});

test('review: nested MXL path and original/extracted provenance are stable',async()=>{
  const xml=score(measure(attrs()+n('48'))),bytes=archive([['META-INF/container.xml',container('nested/score.xml')],['nested/score.xml',xml]],{deflate:false});
  const a=await readInput(bytes,'one.mxl'),b=await readInput(bytes,'renamed.mxl');
  assert.equal(a.input.sha256,b.input.sha256);assert.equal(a.input.scoreSha256,b.input.scoreSha256);assert.notEqual(a.input.sha256,a.input.scoreSha256);
});

test('review: report escapes source evidence, identifiers and filenames without executable markup',()=>{
  const xml=score(measure(attrs()+n('12'))).replaceAll('id="P"','id="&lt;svg onload=1&gt;"').replaceAll('Review','&lt;script&gt;alert(1)&lt;/script&gt;');
  const r=inspectScore(xml);r.input={name:'\"><img src=x onerror=1>',sha256:'x',scoreSha256:'y',bytes:1};
  const h=reportHTML(r);for(const active of ['<script>','<img src=x','<svg onload'])assert.ok(!h.includes(active));
  assert.ok(h.includes('&lt;script&gt;'));assert.ok(h.includes('&lt;note&gt;'));assert.ok(h.includes('default-src \'none\''));
});

test('review: xml-stylesheet processing instruction is inert, not an XML declaration',()=>{
  const xml='<?xml version="1.0" encoding="UTF-8"?><?xml-stylesheet type="text/xsl" href="https://never-fetch.invalid/score.xsl"?>'+score(measure(attrs()+n('48')));
  const m=first(xml);assert.equal(m.status,'clear');assert.equal(m.extent,'4');
});

test('review: pathological repeated diagnostic identity cannot create an amplified result',()=>{
  const xml=score(measure(attrs()+n('48')+'<future/>'.repeat(100))).replaceAll('id="P"',`id="${'P'.repeat(100_000)}"`);
  assert.throws(()=>inspectScore(xml),e=>typeof e.code==='string'&&/limit|size|length/.test(e.code));
});
