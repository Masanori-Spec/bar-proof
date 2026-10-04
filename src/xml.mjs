import {LIMITS,fail} from './limits.mjs';
const validCode=c=>c===9||c===10||c===13||c>=32&&c<=0xD7FF||c>=0xE000&&c<=0xFFFD||c>=0x10000&&c<=0x10FFFF;
function decode(s){if(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(s))fail('xml-entity');return s.replace(/&([^;]+);/g,(_,e)=>{const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};if(named[e])return named[e];const c=e[1]==='x'?Number.parseInt(e.slice(2),16):Number(e.slice(1));if(!validCode(c))fail('xml-character');return String.fromCodePoint(c);});}
export function parseXML(source){
 if(typeof source!=='string'||new TextEncoder().encode(source).length>LIMITS.xmlBytes)fail('xml-size');
 for(const c of source)if(!validCode(c.codePointAt(0)))fail('xml-character');
 let i=source.charCodeAt(0)===0xFEFF?1:0,root=null,stack=[],count=0,doctype=false,decl=false;
 const text=s=>{if(!stack.length){if(s.trim())fail('xml-outside');}else{if(s.includes(']]>'))fail('xml-text');stack.at(-1).text+=decode(s);}};
 while(i<source.length){if(source[i]!=='<'){const end=source.indexOf('<',i);text(source.slice(i,end<0?source.length:end));i=end<0?source.length:end;continue;}
  if(source.startsWith('<!--',i)){const e=source.indexOf('-->',i+4);if(e<0||source.slice(i+4,e).includes('--'))fail('xml-comment');i=e+3;continue;}
  if(source.startsWith('<![CDATA[',i)){const e=source.indexOf(']]>',i+9);if(e<0||!stack.length)fail('xml-cdata');stack.at(-1).text+=source.slice(i+9,e);i=e+3;continue;}
  if(source.startsWith('<?',i)){const e=source.indexOf('?>',i+2);if(e<0)fail('xml-pi');const body=source.slice(i+2,e),target=body.match(/^([A-Za-z_][\w.:-]*)(?:\s|$)/)?.[1];if(!target)fail('xml-pi');if(target.toLowerCase()==='xml'){if(decl||root||stack.length||!/^xml\s+version\s*=\s*(['"])1\.0\1(?:\s+encoding\s*=\s*(['"])(?:UTF-8|utf-8)\2)?(?:\s+standalone\s*=\s*(['"])(?:yes|no)\3)?\s*$/.test(body))fail('xml-declaration');decl=true;}i=e+2;continue;}
  if(source.startsWith('<!DOCTYPE',i)){if(root||stack.length||doctype)fail('xml-doctype');const m=source.slice(i).match(/^<!DOCTYPE\s+([A-Za-z_][\w.-]*)(?:\s+(?:SYSTEM\s+(?:"[^"<>\[\]]*"|'[^'<>\[\]]*')|PUBLIC\s+(?:"[^"<>\[\]]*"|'[^'<>\[\]]*')\s+(?:"[^"<>\[\]]*"|'[^'<>\[\]]*')))?\s*>/);if(!m)fail('xml-doctype');doctype=m[1];i+=m[0].length;continue;}
  if(source.startsWith('<!',i))fail('xml-declaration');
  if(source.startsWith('</',i)){const m=source.slice(i).match(/^<\/([A-Za-z_][\w.:-]*)\s*>/);if(!m||!stack.length||stack.at(-1).name!==m[1])fail('xml-close');const n=stack.pop();i+=m[0].length;n.end=i;continue;}
  const start=i,m=source.slice(i).match(/^<([A-Za-z_][\w.:-]*)/);if(!m)fail('xml-tag');const name=m[1];if(name.length>LIMITS.xmlNameChars)fail('xml-name-limit');i+=m[0].length;const attrs=Object.create(null);
  while(true){const space=source.slice(i).match(/^\s*/)[0];i+=space.length;if(source.startsWith('/>',i)||source[i]==='>')break;if(!space)fail('xml-attribute');const a=source.slice(i).match(/^([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"<]*)"|'([^'<]*)')/);if(!a||Object.hasOwn(attrs,a[1]))fail('xml-attribute');if(a[1].length>LIMITS.xmlNameChars)fail('xml-name-limit');attrs[a[1]]=decode(a[2]??a[3]);i+=a[0].length;}
  const empty=source.startsWith('/>',i);i+=empty?2:1;const n={name,attrs,text:'',children:[],start,end:empty?i:null};if(++count>LIMITS.xmlNodes||stack.length>=LIMITS.xmlDepth)fail('xml-limit');if(stack.length)stack.at(-1).children.push(n);else{if(root)fail('xml-roots');root=n;}if(!empty)stack.push(n);
 }
 if(!root||stack.length||doctype&&doctype!==root.name)fail('xml-incomplete');return {root,externalDoctypeIgnored:!!doctype};
}
export const kids=(node,name)=>node.children.filter(x=>x.name===name);
export const child=(node,name)=>kids(node,name)[0];
export const value=(node,name)=>child(node,name)?.text.trim()??'';
export const fragment=(xml,node)=>xml.slice(node.start,node.end).slice(0,LIMITS.fragmentChars);
export function rejectNamespaces(root,container=false){const walk=[root];while(walk.length){const n=walk.pop();if(n.name.includes(':')||Object.entries(n.attrs).some(([k,v])=>k==='xmlns'&&v!==''&&!(container&&v==='urn:oasis:names:tc:opendocument:xmlns:container')))fail('xml-namespace');for(const c of n.children)walk.push(c);}}
