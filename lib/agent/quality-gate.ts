import type {Lead,ProductRecord,QualityAssessment} from "@/lib/types";

type Input={text:string;channel:"email"|"x"|"linkedin"|"instagram"|"voice";product?:ProductRecord;lead?:Lead;subject?:string};
const cliché=/\b(revolutionary|revolutionize|cutting[- ]edge|game[- ]changer|unlock (?:the )?(?:power|potential)|seamless(?:ly)?|elevate your|transform your business|in today's fast[- ]paced|leverage ai|next[- ]generation)\b/gi;
const absoluteClaim=/\b(guarantee(?:d)?|always|never fails|100%|zero risk|perfect accuracy|instant roi)\b/gi;
const placeholder=/\{\{|\}\}|\[[A-Z_ ]{2,}\]|<company>|<name>|lorem ipsum|insert (?:name|company|link)/i;
function count(re:RegExp,text:string){return Array.from(text.matchAll(new RegExp(re.source,re.flags.includes("g")?re.flags:`${re.flags}g`))).length;}
function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9а-яё%$€£]+/gi," ").trim();}

export function assessDistributionCopy(input:Input):QualityAssessment{
 const text=input.text.trim();let score=100;const issues:string[]=[];const blockingIssues:string[]=[];
 if(!text){return{score:0,pass:false,issues:["Empty copy"],blockingIssues:["Empty copy"]};}
 if(placeholder.test(text)){score-=60;blockingIssues.push("Unresolved placeholder detected");}
 const clichéCount=count(cliché,text);if(clichéCount){score-=Math.min(25,clichéCount*7);issues.push(`Generic AI/marketing clichés detected (${clichéCount})`);}
 const absoluteCount=count(absoluteClaim,text);if(absoluteCount){score-=45;blockingIssues.push("Absolute or guaranteed-outcome claim detected");}
 const numericTokens=Array.from(text.matchAll(/(?:\$|€|£)?\b\d+(?:[.,]\d+)?%?\b/g)).map(x=>x[0]);
 if(numericTokens.length&&input.product){const evidence=normalize([...(input.product.proof||[]),input.product.pricingNotes||""].join(" "));const unsupported=numericTokens.filter(token=>!evidence.includes(normalize(token)));if(unsupported.length){score-=Math.min(35,unsupported.length*12);blockingIssues.push(`Numeric claim(s) not found in verified product proof: ${unsupported.slice(0,4).join(", ")}`);}}
 if(input.product?.forbiddenClaims?.length){for(const forbidden of input.product.forbiddenClaims){const phrase=normalize(forbidden);if(phrase.length>8&&normalize(text).includes(phrase)){score-=50;blockingIssues.push(`Forbidden product claim/style matched: ${forbidden}`);}}}
 if(input.product?.brandVoice?.avoid?.length){for(const avoid of input.product.brandVoice.avoid){const phrase=normalize(avoid);if(phrase.length>5&&normalize(text).includes(phrase)){score-=10;issues.push(`Brand avoid-pattern matched: ${avoid}`);}}}
 const exclamations=(text.match(/!/g)||[]).length;if(exclamations>2){score-=Math.min(12,(exclamations-2)*3);issues.push("Too many exclamation marks");}
 const emojiCount=Array.from(text).filter(char=>/\p{Extended_Pictographic}/u.test(char)).length;if(emojiCount>3){score-=10;issues.push("Excessive emoji use");}
 if(input.channel==="email"){
   const words=text.split(/\s+/).length;if(words>150){score-=15;issues.push(`Email is long (${words} words)`);}if(input.lead&&!normalize(text).includes(normalize(input.lead.company))){score-=12;issues.push("Company name missing from first-touch personalization");}
 }
 if(input.channel==="linkedin"&&text.length>3000){score-=20;issues.push("LinkedIn post is unusually long");}
 if(input.channel==="x"&&text.length>350&& !/^\s*1\s*[/.)-]/m.test(text)){score-=12;issues.push("X copy is long for a single post");}
 if(input.channel==="voice"&&text.split(/\s+/).length>80){score-=12;issues.push("Call opening is too long for natural speech");}
 if(input.subject&&input.subject.length>90){score-=10;issues.push("Email subject is too long");}
 score=Math.max(0,Math.min(100,score));const pass=blockingIssues.length===0&&score>=70;return{score,pass,issues:[...blockingIssues,...issues],blockingIssues};
}
