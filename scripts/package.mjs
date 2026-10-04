import {execFileSync} from 'node:child_process';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
await mkdir('../bar-proof-output',{recursive:true});
const check=execFileSync('npm',['run','check'],{encoding:'utf8',maxBuffer:16*1024*1024});await writeFile('../bar-proof-output/local-check.log',check);const testCount=Number(check.match(/ℹ tests (\d+)/)?.[1]);if(!testCount)throw Error('Cannot establish test count');
execFileSync('python3',['-c',`from pathlib import Path
import hashlib,json,zipfile
root=Path('.');out=Path('../bar-proof-output');files=[]
for p in sorted(root.rglob('*')):
 if not p.is_file() or any(x in {'.git','node_modules','dist','__pycache__','artifacts'} for x in p.parts) or p.suffix=='.pyc': continue
 files.append(p)
with zipfile.ZipFile(out/'bar-proof-source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files:
  info=zipfile.ZipInfo('bar-proof/'+p.as_posix(),(2026,10,4,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,p.read_bytes())
manifest={'schema':'barproof.source-manifest.v1','version':'0.1.0','status':'source-frozen-after-independent-review','files':[{'path':p.as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files],'verification':{'local':'${testCount} Node tests, independent 22-case/28-measure Python oracle, syntax and static build passed','independentReview':'16 reviewer regressions and scoped review passed; see docs/INDEPENDENT_REVIEW.md','browser':'authored, unrun: environment restricted; no bypass attempted','hostedCI':'authored, unrun','visualQA':'unrun','publication':'not performed'},'archive':{'name':'bar-proof-source.zip','bytes':(out/'bar-proof-source.zip').stat().st_size,'sha256':hashlib.sha256((out/'bar-proof-source.zip').read_bytes()).hexdigest()}}
(out/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\\n')
print(json.dumps({'files':len(files),'archive':manifest['archive']},indent=2))
`],{stdio:'inherit'});
const manifest=JSON.parse(await readFile('../bar-proof-output/source-manifest.json','utf8'));for(const f of manifest.files){const bytes=await readFile(f.path);if(createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('Manifest mismatch: '+f.path);}await writeFile('../bar-proof-output/manifest-verification.json',JSON.stringify({status:'passed',verifiedFiles:manifest.files.length,archiveSha256:manifest.archive.sha256},null,2)+'\n');
