/** Public sales-brief contract. All prices and delivery windows are custom;
 * nothing here claims an AI provider, project result, conversion or checkout.
 */
export type FilmOffer = "launch"|"product"|"feature";
export type FilmFormat = "portrait"|"landscape"|"square";
export const MOTION_OFFERS = [
 {id:"launch",number:"01",name:"Launch Film",length:"15–30 sec",detail:"One decisive story for a campaign, product drop or social launch.",deliverables:"Original visual direction · edited master · one primary format."},
 {id:"product",number:"02",name:"Product Story",length:"45–90 sec",detail:"Reveal the real product, the user problem, and what changes.",deliverables:"Narrative structure · real UI moments · sound plan · one master."},
 {id:"feature",number:"03",name:"Feature Film",length:"2–5 min",detail:"An ambitious editorial film told in chapters with room to explain.",deliverables:"Chapter treatment · full timeline · approved sources · feature master."}
] as const;
export const MOTION_BUDGETS = ["Not sure yet","Under $1,000","$1,000–$3,000","$3,000–$7,500","$7,500+"] as const;
export const MOTION_GOALS=["Product launch","Explain a software product","Brand campaign","Investor/partner presentation","Social distribution","Other"] as const;
export type MotionCommission = {
  name:string;email:string;company:string;website:string;
  offer:FilmOffer;format:FilmFormat;goal:string;audience:string;
  budget:string;timeline:string;brief:string;assets:string;consent:boolean;
};
const plain=(x:unknown,max:number)=>{
 if(typeof x!=="string")return "";
 return x.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim().slice(0,max);
};
const url=(x:unknown)=>{
 const value=plain(x,250);if(!value)return "";
 try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)&&
   !u.username&&!u.password?u.origin+u.pathname.slice(0,180):"";}catch{return ""}
};
export function parseMotionCommission(raw:unknown,requireConsent=true):MotionCommission{
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Complete the film brief first");
 const p=raw as Record<string,unknown>;
 const name=plain(p.name,80),email=plain(p.email,254),company=plain(p.company,100),
  audience=plain(p.audience,180),brief=plain(p.brief,1700),assets=plain(p.assets,420),
  goal=plain(p.goal,80),timeline=plain(p.timeline,80),budget=plain(p.budget,80),
  format=plain(p.format,20) as FilmFormat,offer=plain(p.offer,20) as FilmOffer;
 if(name.length<2||typeof p.email!=="string"||/[\r\n]/.test(p.email)||
    !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,63}$/i.test(email))
   throw Error("Enter your name and a valid contact email");
 if(company.length<2||brief.length<25||audience.length<4)
   throw Error("Add your company, audience and at least 25 characters about the film");
 if(!MOTION_OFFERS.some(x=>x.id===offer)||!["portrait","landscape","square"].includes(format)||
   !MOTION_GOALS.includes(goal as typeof MOTION_GOALS[number]))
   throw Error("Select a valid film type, format and goal");
 if(!MOTION_BUDGETS.includes(budget as typeof MOTION_BUDGETS[number]))
   throw Error("Choose a budget range, including 'Not sure yet'");
 if(requireConsent&&p.consent!==true)throw Error("Consent is required to contact you about this brief");
 return{name,email,company,website:url(p.website),offer,format,goal,audience,
  budget,timeline,brief,assets,consent:p.consent===true};
}
export function motionCommissionText(c:MotionCommission):string{
 const offer=MOTION_OFFERS.find(o=>o.id===c.offer)!;
 return [
 "MARGARYAN MOTION STUDIO / PROJECT ENQUIRY",
 "PROJECT DIRECTION / "+offer.name+" ("+offer.length+")",
 "",
 "CONTACT",c.name+" · "+c.company,c.email,c.website||"Website not supplied",
 "",
 "FILM",c.goal,"Audience: "+c.audience,
 "Format: "+c.format,"Budget to discuss: "+c.budget,
 "Requested timeframe: "+(c.timeline||"To discuss"),
 "",
 "CREATIVE BRIEF",c.brief,
 "",
 "SOURCE MATERIALS",(c.assets||"To discuss"),
 "",
 "PRODUCTION TERMS",
 "Concept, scope, availability, usage rights and pricing require written approval.",
 "No guaranteed sales, AI rankings, customer results or automated AI-generated video are implied."
 ].join("\n");
}
