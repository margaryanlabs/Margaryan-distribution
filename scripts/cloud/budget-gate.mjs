#!/usr/bin/env node
/**
 * Markarian Cloud budget gate for owner-reviewed VPS quotes.
 * Pure arithmetic, no billing API, SSH, Docker, purchases or deploy permissions.
 * USD cents only. A quote is not an enforceable provider spending limit.
 */
import {lstatSync,readFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';

export const MAX_QUOTE_AGE_DAYS=14;
const REQUIRED=['vps','ipv4','offsiteBackup','snapshots','monitoring','otherFixed','meteredWorstCase','tax','reserve'];
const USD=/^[0-9]+(?:\.[0-9]{1,2})?$/;
export function dollarsToCents(value){
 if(typeof value!=='string'||!USD.test(value))throw Error('Amounts must be decimal USD strings with at most 2 fractional digits');
 const [whole,frac='']=value.split('.');
 const cents=Number(whole)*100+Number((frac+'00').slice(0,2));
 if(!Number.isSafeInteger(cents)||cents>100_000_000)throw Error('Amount out of bounds');
 return cents;
}
function safeDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return NaN;
 const stamp=Date.parse(value+'T00:00:00.000Z');
 return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value?stamp:NaN;
}
export function assessBudget(input,{today='2026-10-26'}={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected budget object');
 if(input.currency!=='USD'||input.scope!=='hosting-only')throw Error('Only explicit USD hosting-only estimates accepted');
 if(input.productionApproved!==undefined||input.providerToken!==undefined)throw Error('Never include authority or credentials');
 if(typeof input.quoteCheckedAt!=='string'||typeof input.maxPerMonth!=='string')throw Error('Missing pricing date or cap');
 const allowed=new Set(REQUIRED);
 if(!input.monthly||typeof input.monthly!=='object'||Array.isArray(input.monthly)||
   Object.keys(input.monthly).some(k=>!allowed.has(k))||REQUIRED.some(k=>!Object.hasOwn(input.monthly,k)))
   throw Error('Every hosting cost category must be declared, including zeros');
 const amounts=Object.fromEntries(REQUIRED.map(key=>[key,dollarsToCents(input.monthly[key])]));
 const cap=dollarsToCents(input.maxPerMonth);
 if(cap<=0)throw Error('Cap must be positive');
 if(!Number.isSafeInteger(input.hostCount)||input.hostCount<1||input.hostCount>10)throw Error('Invalid VPS count');
 if(typeof input.meteredLimitEnforced!=='boolean'||typeof input.allHostingChargesIncluded!=='boolean')
   throw Error('Explicit variable-cost and coverage declarations required');
 if(!Array.isArray(input.excludedNonHostingCosts)||input.excludedNonHostingCosts.some(x=>typeof x!=='string'||x.length>80))
   throw Error('Explicit exclusions list required');
 const ageDays=(safeDate(today)-safeDate(input.quoteCheckedAt))/86400000;
 const fresh=Number.isInteger(ageDays)&&ageDays>=0&&ageDays<=MAX_QUOTE_AGE_DAYS;
 const costCents=Object.values(amounts).reduce((sum,n)=>sum+n,0);
 const blockers=[];
 if(!fresh)blockers.push('STALE_OR_INVALID_QUOTE_DATE');
 if(!input.meteredLimitEnforced)blockers.push('METERED_SPENDING_CAP_NOT_ENFORCED_BY_PROVIDER');
 if(!input.allHostingChargesIncluded)blockers.push('HOSTING_COSTS_INCOMPLETE');
 if(costCents>cap)blockers.push('OVER_BUDGET');
 // A quoted fixed price and external cap are still subject to real billing and resource availability.
 const verdict=blockers.length?'BLOCKED':'HOSTING_ESTIMATE_FITS_REVIEW_REQUIRED';
 return {schema:'markarian-budget-gate/v1',scope:'hosting-only',currency:'USD',
  hostCount:input.hostCount,maxMonthlyCents:cap,worstCaseMonthlyCents:costCents,
  headroomCents:cap-costCents,quoteAgeDays:Number.isFinite(ageDays)?ageDays:null,
  costsCents:amounts,excludedNonHostingCosts:input.excludedNonHostingCosts,
  verdict,blockers,canPurchase:false,canDeploy:false,canMigrateProduction:false,
  warning:'Budget arithmetic is not a price guarantee or a spending cap. Provider invoices, FX, VAT and variable usage must be checked independently.'};
}
export const EXAMPLE=Object.freeze({
 currency:'USD',scope:'hosting-only',maxPerMonth:'50.00',quoteCheckedAt:'2026-10-26',hostCount:1,
 monthly:{vps:'34.99',ipv4:'0.60',offsiteBackup:'7.99',snapshots:'0.00',
  monitoring:'0.00',otherFixed:'0.00',meteredWorstCase:'0.00',tax:'0.00',reserve:'5.00'},
 meteredLimitEnforced:false,allHostingChargesIncluded:false,
 excludedNonHostingCosts:['AI API','SMTP','domain renewals','human operations']});
export function main(argv=process.argv.slice(2),clock=()=>new Date().toISOString().slice(0,10)){
 if(argv.length===1&&argv[0]==='--example'){
  process.stdout.write(JSON.stringify(EXAMPLE,null,2)+'\n');return 0;
 }
 if(argv.length!==2||argv[0]!=='--assess'||!isAbsolute(argv[1])){
  process.stderr.write('Usage: budget-gate.mjs --example | --assess /absolute/private/quote.json\n');return 2;
 }
 try{
  const info=lstatSync(argv[1]);
  if(!info.isFile()||(info.mode&0o077)!==0||info.size>16384||
    (typeof process.getuid==='function'&&info.uid!==process.getuid()))
    throw Error('Owner-only quote required');
  const report=assessBudget(JSON.parse(readFileSync(argv[1],'utf8')),{today:clock()});
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  return report.verdict==='BLOCKED'?1:3;
 }catch{process.stderr.write('BUDGET BLOCKED: missing, insecure or invalid estimate. No purchase/deploy.\n');return 1;}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=main();
