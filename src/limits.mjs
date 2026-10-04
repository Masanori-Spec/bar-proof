export const VERSION='0.1.0';
export const LIMITS=Object.freeze({inputBytes:8*1024*1024,xmlBytes:8*1024*1024,archiveEntries:128,archiveTotalBytes:24*1024*1024,inflationRatio:200,xmlNodes:180000,xmlDepth:64,parts:64,measures:4000,events:20000,eventsPerMeasure:1000,numberDigits:24,rationalDigits:256,meterFractionDigits:128,meterPairs:32,meterTerms:64,meterTextChars:4096,measureChildren:2000,findings:12000,findingsPerMeasure:256,xmlNameChars:128,partIdChars:128,partNameChars:256,measureLabelChars:128,voiceStaffChars:64,fragmentChars:1200});
export class InputError extends Error { constructor(code,detail=''){super(detail?`${code}: ${detail}`:code);this.name='InputError';this.code=code;} }
export const fail=(code,detail)=>{throw new InputError(code,detail);};
