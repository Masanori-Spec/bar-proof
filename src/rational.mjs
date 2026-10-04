import {LIMITS,fail} from './limits.mjs';
const gcd=(a,b)=>{a=a<0n?-a:a;while(b){[a,b]=[b,a%b];}return a||1n;};
export class Q {
 constructor(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)fail('number');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);this.n=n/g;this.d=d/g;if(this.n.toString().replace('-','').length>LIMITS.rationalDigits||this.d.toString().length>LIMITS.rationalDigits)fail('rational-limit');}
 static decimal(s){s=String(s).trim();if(!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)||s.replace(/[^0-9]/g,'').length>LIMITS.numberDigits)fail('number');let neg=s[0]==='-';s=s.replace(/^[+-]/,'');let [a,b='']=s.split('.');return new Q(BigInt((a||'0')+b)*(neg?-1n:1n),10n**BigInt(b.length));}
 add(q){return new Q(this.n*q.d+q.n*this.d,this.d*q.d);} sub(q){return new Q(this.n*q.d-q.n*this.d,this.d*q.d);} div(q){return new Q(this.n*q.d,this.d*q.n);} cmp(q){const d=this.n*q.d-q.n*this.d;return d<0n?-1:d>0n?1:0;} toString(){return this.d===1n?String(this.n):`${this.n}/${this.d}`;}
}
export const ZERO=new Q(0), str=q=>q===null?null:q.toString();
export const positive=s=>{const q=Q.decimal(s);if(q.n<=0n)fail('number');return q;};
