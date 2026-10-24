#!/usr/bin/env node
/**
 * Markarian Restore Lab — streaming offsite restic dump into an isolated Compose
 * PostgreSQL container, never directly into a user-specified database host.
 * Requires separately initialized Docker Compose lab and explicit digest approval.
 */
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {validateRecoveryEnvironment} from './recovery.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const LAB_COMPOSE=resolve(ROOT,'deploy/cloud/restore/compose.yaml');
const DOCKER_HOST='unix:///var/run/docker.sock';
const PROJECT='markarian-restore-lab';
const SERVICE='db';
const SNAPSHOT=/^[a-f0-9]{8,64}$/;
const FILE=/^[a-z0-9][a-z0-9_-]{1,47}-[0-9TZ-]+\.dump$/;
const CONTAINER=/^[a-f0-9]{64}$/;
const wait=(child,label)=>new Promise((accept,reject)=>{
  child.once('error',()=>reject(Error(label+' executable unavailable')));
  child.once('close',code=>code===0?accept():reject(Error(label+' exited unsuccessfully')));
});
const safeEnv=(env)=>{
  const result={...env};
  delete result.PGPASSWORD;
  delete result.RESTIC_PASSWORD;
  // Force local Docker only; user Docker contexts and remote engines are not trusted.
  delete result.DOCKER_HOST;
  delete result.DOCKER_CONTEXT;
  for(const key of ['DOCKER_CONFIG','DOCKER_CERT_PATH','DOCKER_TLS_VERIFY','DOCKER_API_VERSION','DOCKER_CUSTOM_HEADERS','COMPOSE_FILE','COMPOSE_PROJECT_NAME','COMPOSE_PROFILES']) delete result[key];
  return result;
};

export function validateSelector(snapshot,filename){
  if(!SNAPSHOT.test(snapshot||''))throw Error('Use a hex Restic snapshot ID');
  if(!FILE.test(filename||''))throw Error('Use an exact safe PostgreSQL archive filename');
  return {snapshot,filename};
}
export function approvalDigest(snapshot,filename){
  validateSelector(snapshot,filename);
  return createHash('sha256').update(`restore-lab/v1\n${snapshot}\n${filename}\n${PROJECT}\n${SERVICE}`).digest('hex').slice(0,24);
}
export function validateContainerMetadata(id,metadata){
  if(!CONTAINER.test(id||''))throw Error('No unique local lab container ID');
  if(!metadata||metadata.Id!==id||metadata.State?.Running!==true||metadata.State?.Paused===true||
     metadata.State?.Restarting===true)throw Error('Restore lab container is not the verified running container');
  if(metadata.State?.Health?.Status!=='healthy')throw Error('Restore lab container health must be healthy');
  const labels=metadata.Config?.Labels;
  if(labels?.['com.docker.compose.project']!==PROJECT||labels?.['com.docker.compose.service']!==SERVICE)
    throw Error('Refusing container not owned by dedicated restore lab');
  if(!['postgres:16-alpine','docker.io/library/postgres:16-alpine'].includes(metadata.Config?.Image))
    throw Error('Restore lab must use the reviewed PostgreSQL image');
  const host=metadata.HostConfig;
  if(!host||host.NetworkMode!==PROJECT+'_restore_private')
    throw Error('Restore lab must use its exact private Docker network');
  if(host.Privileged!==false||!Array.isArray(host.SecurityOpt)||
     !host.SecurityOpt.includes('no-new-privileges:true'))
    throw Error('Restore lab must prohibit privileged escalation');
  for(const key of ['CapAdd','Devices','DeviceRequests','VolumesFrom']){
    if(host[key]!=null&&(!Array.isArray(host[key])||host[key].length!==0))
      throw Error('Unexpected restore lab host capability or volume attachment');
  }
  for(const key of ['PidMode','IpcMode','UTSMode','CgroupnsMode']){
    if(host[key]&&!['private'].includes(host[key]))
      throw Error('Host or shared namespace prohibited for restore lab');
  }
  if(host.RestartPolicy?.Name&&host.RestartPolicy.Name!=='no')
    throw Error('Restore lab must remain disposable');
  const ports=Object.values(host.PortBindings||{});
  if(ports.some(v=>v!==null&&(!Array.isArray(v)||v.length!==0)))
    throw Error('Published Docker port detected');
  const net=Object.keys(metadata.NetworkSettings?.Networks||{});
  if(net.length!==1||net[0]!==PROJECT+'_restore_private')
    throw Error('Restore lab must use only the dedicated private Docker network');
  if(Object.values(metadata.NetworkSettings?.Ports||{}).some(v=>v!==null&&(!Array.isArray(v)||v.length!==0)))
    throw Error('Published Docker port detected');
  if(!Object.hasOwn(host.Tmpfs||{},'/var/lib/postgresql/data'))
    throw Error('Restore lab database must use temporary storage');
  // Docker Compose secrets appear as precisely one read-only bind mount.
  if(!Array.isArray(metadata.Mounts)||metadata.Mounts.length!==1||
     metadata.Mounts[0]?.Destination!=='/run/secrets/lab_password'||
     metadata.Mounts[0]?.Type!=='bind'||metadata.Mounts[0]?.RW!==false)
    throw Error('Unreviewed host or persistent Docker mount detected');
  if(host.Binds!=null&&(!Array.isArray(host.Binds)||host.Binds.some(v=>
     typeof v!=='string'||!v.endsWith(':/run/secrets/lab_password:ro'))))
    throw Error('Unexpected host bind mounting in restore lab');
  return true;
}
// Allow only fixed command+arguments, no shell or user-supplied target host/database.
async function output(binary,args,env,spawnFn=spawn){
  const fixedArgs=binary==='docker'?['--host',DOCKER_HOST,...args]:args;
  const p=spawnFn(binary,fixedArgs,{env:safeEnv(env),shell:false,stdio:['ignore','pipe','ignore']});
  let text='',size=0;
  p.stdout.on('data',chunk=>{size+=chunk.length;if(size<=16384)text+=chunk.toString('utf8');else p.kill();});
  await wait(p,binary);
  if(size>16384)throw Error(binary+' returned oversized metadata');
  return text.trim();
}
export async function locateLab(env,spawnFn=spawn){
  const id=await output('docker',['compose','-f',LAB_COMPOSE,'-p',PROJECT,'ps','-q',SERVICE],env,spawnFn);
  if(!CONTAINER.test(id))throw Error('Start a unique dedicated Restore Lab container first');
  const raw=await output('docker',['inspect','--format','{{json .}}',id],env,spawnFn);
  let metadata;
  try{metadata=JSON.parse(raw);}catch{throw Error('Invalid Docker inspection response');}
  validateContainerMetadata(id,metadata);
  return id;
}
async function countTables(id,env,spawnFn=spawn){
  const sql="SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%';";
  const result=await output('docker',['exec','--user','postgres',id,'psql','-X','-A','-t','-v','ON_ERROR_STOP=1','-d','restore_lab','-c',sql],env,spawnFn);
  if(!/^\d{1,7}$/.test(result))throw Error('Restore Lab schema probe invalid');
  return Number(result);
}

export async function runRestoreLab(snapshot,filename,env=process.env,spawnFn=spawn){
  validateSelector(snapshot,filename);
  validateRecoveryEnvironment(env);
  // This does not inspect/mutate any production Postgres endpoint.
  const id=await locateLab(env,spawnFn);
  if(await countTables(id,env,spawnFn)!==0)throw Error('Restore Lab is not empty; refuse overwrite');
  const restic=spawnFn('restic',['dump',snapshot,filename],{env:safeEnv(env),shell:false,stdio:['ignore','pipe','ignore']});
  const restore=spawnFn('docker',['--host',DOCKER_HOST,'exec','--user','postgres','-i',id,'pg_restore','--exit-on-error','--no-owner','--no-acl','--dbname','restore_lab'],{
    env:safeEnv(env),shell:false,stdio:['pipe','ignore','ignore']
  });
  restic.stdout.on('error',()=>{});
  restore.stdin.on('error',()=>{});
  restic.stdout.pipe(restore.stdin);
  let dumpOk=false,restoreOk=false;
  const results=await Promise.allSettled([wait(restic,'restic'),wait(restore,'docker restore')]);
  dumpOk=results[0].status==='fulfilled';restoreOk=results[1].status==='fulfilled';
  if(!dumpOk||!restoreOk)throw Error('Restore stream failed; do not reuse this lab without recreating it');
  const tableCount=await countTables(id,env,spawnFn);
  if(tableCount<1)throw Error('Restore completed without any application table');
  return {schema:'markarian-restore-lab/v1',gate:'ISOLATED_RESTORE_OBSERVED',
    snapshotId:snapshot,tableCount,appChecksPerformed:false,productionReady:false,canMigrateProduction:false};
}

export function parseArgs(args){
  if(args.length===1&&args[0]==='--plan')return {mode:'plan'};
  if(args.length===3&&args[0]==='--review')return {mode:'review',...validateSelector(args[1],args[2])};
  if(args.length===5&&args[0]==='--restore'&&args[3]==='--approve')
    return {mode:'restore',...validateSelector(args[1],args[2]),approval:args[4]};
  return null;
}
export async function main(args=process.argv.slice(2),env=process.env,stdout=process.stdout,stderr=process.stderr,spawnFn=spawn){
  let config;
  try{config=parseArgs(args);}catch{config=null;}
  if(!config){stderr.write('Usage: --plan | --review SNAPSHOT_ID FILENAME | --restore SNAPSHOT_ID FILENAME --approve REVIEW_DIGEST\n');return 2;}
  if(config.mode==='plan'){
    stdout.write('Restore Lab: isolated, disposable Docker Compose PostgreSQL, no published ports.\n'+
      '1. Secure Docker host and offsite Restic credentials. Review deploy/cloud/restore/README.md.\n'+
      '2. Start the dedicated Compose lab manually, then --review ID FILE.\n'+
      '3. --restore ID FILE --approve DIGEST only writes inside the lab container.\n'+
      'No production database access, deployment, cutover or backup schedule.\n');return 0;
  }
  if(config.mode==='review'){
    stdout.write(JSON.stringify({schema:'markarian-restore-lab-plan/v1',snapshotId:config.snapshot,filename:config.filename,
      target:'dedicated-empty-compose-postgres',reviewDigest:approvalDigest(config.snapshot,config.filename),
      execution:'NOT_PERFORMED',productionReady:false},null,2)+'\n');return 0;
  }
  if(config.approval!==approvalDigest(config.snapshot,config.filename)){
    stderr.write('RESTORE REFUSED: approval mismatch; review snapshot and target first.\n');return 1;
  }
  try{
    const result=await runRestoreLab(config.snapshot,config.filename,env,spawnFn);
    stdout.write(JSON.stringify(result,null,2)+'\n');return 0;
  }catch{
    stderr.write('RESTORE NOT VERIFIED: isolated container, credentials, archive or schema check failed.\n');return 1;
  }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)process.exitCode=await main();