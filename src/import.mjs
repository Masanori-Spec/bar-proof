import {LIMITS,fail} from './limits.mjs';
import {parseXML,child,kids,rejectNamespaces} from './xml.mjs';
const utf8=new TextDecoder('utf-8',{fatal:true});
export function safePath(name){return !!name&&name.length<1024&&!/[\\\x00-\x1f\x7f:%?#]/.test(name)&&!name.startsWith('/')&&name.split('/').every((p,i,a)=>p!=='.'&&p!=='..'&&(p!==''||i===a.length-1));}
export function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
export function zipDirectory(bytes){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),n=bytes.length;if(n<22)fail('zip-header');let e=-1;for(let i=n-22;i>=Math.max(0,n-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===n){e=i;break;}if(e<0)fail('zip-header');
 const count=v.getUint16(e+10,true),size=v.getUint32(e+12,true),start=v.getUint32(e+16,true);if(v.getUint16(e+4,true)||v.getUint16(e+6,true)||count!==v.getUint16(e+8,true)||count===65535||size===0xffffffff||start===0xffffffff)fail('zip-format');if(!count||count>LIMITS.archiveEntries||start+size!==e)fail('zip-limit');
 let p=start,total=0;const entries=new Map(),spans=[];
 for(let i=0;i<count;i++){
  if(p+46>e||v.getUint32(p,true)!==0x02014b50)fail('zip-central');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),crc=v.getUint32(p+16,true),compressed=v.getUint32(p+20,true),uncompressed=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),xl=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),offset=v.getUint32(p+42,true);if(p+46+nl+xl+cl>e)fail('zip-central');const name=utf8.decode(bytes.subarray(p+46,p+46+nl));
  if(!safePath(name)||entries.has(name)||entries.has(name.normalize('NFC'))||name!==name.normalize('NFC'))fail('zip-path');if(flags&~(0x0800|0x0008|0x0006)||![0,8].includes(method)||v.getUint16(p+34,true))fail('zip-format');if((v.getUint32(p+38,true)>>>16&0xf000)===0xa000)fail('zip-link');if(uncompressed>LIMITS.xmlBytes||total+uncompressed>LIMITS.archiveTotalBytes||uncompressed>Math.max(1024,compressed*LIMITS.inflationRatio))fail('zip-limit');total+=uncompressed;
  if(offset+30>start||v.getUint32(offset,true)!==0x04034b50)fail('zip-local');const lflags=v.getUint16(offset+6,true),lm=v.getUint16(offset+8,true),ln=v.getUint16(offset+26,true),lx=v.getUint16(offset+28,true),data=offset+30+ln+lx;if(lflags!==flags||lm!==method||data+compressed>start||utf8.decode(bytes.subarray(offset+30,offset+30+ln))!==name)fail('zip-local');if(!(flags&8)&&(v.getUint32(offset+14,true)!==crc||v.getUint32(offset+18,true)!==compressed||v.getUint32(offset+22,true)!==uncompressed))fail('zip-local');
  let spanEnd=data+compressed;if(flags&8){let d=spanEnd;if(d+4<=start&&v.getUint32(d,true)===0x08074b50)d+=4;if(d+12>start||v.getUint32(d,true)!==crc||v.getUint32(d+4,true)!==compressed||v.getUint32(d+8,true)!==uncompressed)fail('zip-descriptor');spanEnd=d+12;}spans.push([offset,spanEnd]);entries.set(name,{name,method,crc,compressed,uncompressed,data});p+=46+nl+xl+cl;
 }
 if(p!==e)fail('zip-central');spans.sort((a,b)=>a[0]-b[0]);for(let i=1;i<spans.length;i++)if(spans[i][0]<spans[i-1][1])fail('zip-overlap');return entries;
}
async function inflate(bytes,entry){let result;if(entry.method===0)result=bytes.slice(entry.data,entry.data+entry.compressed);else{
 if(typeof DecompressionStream==='undefined')fail('zip-unavailable');let stream;try{stream=new Blob([bytes.subarray(entry.data,entry.data+entry.compressed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}catch{fail('zip-unavailable');}
 const reader=stream.getReader(),chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>entry.uncompressed||length>LIMITS.xmlBytes){await reader.cancel();fail('zip-inflation');}chunks.push(value);}}catch(e){if(e.code)throw e;fail('zip-inflation');}result=new Uint8Array(length);let p=0;for(const c of chunks){result.set(c,p);p+=c.length;}
 }if(result.length!==entry.uncompressed||crc32(result)!==entry.crc)fail('zip-integrity');return result;}
export async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function readInput(buffer,name='score.musicxml'){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);if(!bytes.length||bytes.length>LIMITS.inputBytes)fail('input-size');let xmlBytes=bytes,path=null,archiveEntries=0;
 if(bytes[0]===0x50&&bytes[1]===0x4b){const entries=zipDirectory(bytes);archiveEntries=entries.size;const entry=entries.get('META-INF/container.xml');if(!entry)fail('zip-container');const parsed=parseXML(utf8.decode(await inflate(bytes,entry)));rejectNamespaces(parsed.root,true);if(parsed.root.name!=='container')fail('zip-container');const groups=kids(parsed.root,'rootfiles');if(groups.length!==1)fail('zip-container');const first=child(groups[0],'rootfile');path=first?.attrs['full-path'];if(!safePath(path)||path.endsWith('/')||!entries.has(path)||path==='META-INF/container.xml')fail('zip-rootfile');const type=first.attrs['media-type'];if(type&&type!=='application/vnd.recordare.musicxml+xml')fail('zip-rootfile');xmlBytes=await inflate(bytes,entries.get(path));
 }else if(/\.mxl$/i.test(name))fail('zip-header');
 let xml;try{xml=utf8.decode(xmlBytes);}catch{fail('encoding');}return {xml,input:{name:String(name).slice(0,500),bytes:bytes.length,sha256:await digest(bytes),scoreSha256:await digest(xmlBytes),archivePath:path,archiveEntries}};
}
