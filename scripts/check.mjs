import {readdir,readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';
for(const dir of ['src','scripts','tests','tests/browser'])for(const f of await readdir(dir))if(f.endsWith('.mjs'))execFileSync(process.execPath,['--check',`${dir}/${f}`],{stdio:'inherit'});
for(const f of await readdir('src'))if(f.endsWith('.mjs')){const s=await readFile('src/'+f,'utf8');if(/\beval\(|\bnew Function\(|\bfetch\(|\bXMLHttpRequest\b|localStorage|sessionStorage/.test(s))throw Error(`Forbidden execution/network/storage primitive in ${f}`);}
console.log('All JS syntax checked; runtime has no fetch, evaluation or persistent storage primitives');
