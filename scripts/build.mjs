import {writeWorker} from './worker-bundle.mjs';await writeWorker();
import {mkdir,cp,rm} from 'node:fs/promises';await rm('dist',{recursive:true,force:true});await mkdir('dist');await cp('public','dist',{recursive:true});await cp('src','dist/src',{recursive:true});console.log('Built dependency-free static app in dist/');
