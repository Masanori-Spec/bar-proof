import {readInput} from './import.mjs';
import {inspectScore} from './core.mjs';
self.onmessage=async({data})=>{try{const {xml,input}=await readInput(data.buffer,data.name);const result=inspectScore(xml);self.postMessage({ok:true,result:{...result,input}});}catch(error){self.postMessage({ok:false,error:{code:error.code||'unknown',message:String(error.message)}});}};
