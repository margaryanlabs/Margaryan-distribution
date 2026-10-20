import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,chmodSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateRecoveryEnvironment} from './recovery.mjs';
const script=fileURLToPath(new URL('./recovery.mjs',import.meta.url));
function prep(){
 const path=mkdtempSync(join(tmpdir(),'mc-recovery-'));
 mkdirSync(join(path,'bin'));
 const restic=['#!/bin/sh','case "$1" in',
  ' snapshots) echo "[]" ;;',
  ' backup) cat >/dev/null; [ "$MC_MOCK_RESTIC_FAIL" = "1" ] && exit 12; echo \'{"message_type":"summary","snapshot_id":"deadbeef01"}\' ;;',
  ' check) exit 0 ;;',
  ' dump) printf "MOCK_CUSTOM_FORMAT" ;;',
  ' *) exit 10 ;;','esac',''].join('\n');
 const pgdump=['#!/bin/sh','[ "$MC_MOCK_PGDUMP_FAIL" = "1" ] && exit 9',
  'printf "MOCK_CUSTOM_FORMAT\\n"',''].join('\n');
 const restore=['#!/bin/sh','cat >/dev/null','exit 0',''].join('\n');
 for(const [name,code] of [['restic',restic],['pg_dump',pgdump],['pg_restore',restore]])
  writeFileSync(join(path,'bin',name),code,{mode:0o700});
 for(const file of ['restic-password','pgpass'])
  writeFileSync(join(path,file),'TEST_PASSWORD_DO_NOT_LOG',{mode:0o600});
 const env={...process.env,PATH:join(path,'bin')+':'+process.env.PATH,
  RESTIC_REPOSITORY:'s3:https://backup.example.invalid/markarian',
  RESTIC_PASSWORD_FILE:join(path,'restic-password'),
  PGPASSFILE:join(path,'pgpass'),PGHOST:'db.internal',PGUSER:'backup_reader',
  PGDATABASE:'project_db',PGPORT:'5432',CLOUD_BACKUP_PROJECT:'promptence'};
 return {path,env,run:(...args)=>spawnSync(process.execPath,[script,...args],{env,encoding:'utf8',timeout:10000})};
}
test('plan is offline and never prints secrets',()=>{
 const r=spawnSync(process.execPath,[script,'--plan'],{encoding:'utf8'});
 assert.equal(r.status,0);assert.match(r.stdout,/Restoring/);
 assert.doesNotMatch(r.stdout,/TEST_PASSWORD/);
});
test('local repository and world-readable secret files refused',()=>{
 const {env,path}=prep();
 try{
  assert.throws(()=>validateRecoveryEnvironment({...env,RESTIC_REPOSITORY:'/var/backups'}),/offsite/);
  chmodSync(env.RESTIC_PASSWORD_FILE,0o644);
  assert.throws(()=>validateRecoveryEnvironment(env,{postgres:true}),/private regular file/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('rejects missing DB config and inline PGPASSWORD',()=>{
 const {env,path}=prep();
 try{
  assert.throws(()=>validateRecoveryEnvironment({...env,PGDATABASE:''},{postgres:true}),/PGDATABASE/);
  assert.throws(()=>validateRecoveryEnvironment({...env,PGPASSWORD:'PRIVATE'},{postgres:true}),/PGPASSWORD/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('preflight validates configuration only',()=>{
 const {run,path}=prep();
 try{const r=run('--preflight');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/no backup or restore attempted/);}
 finally{rmSync(path,{recursive:true,force:true});}
});
test('streaming backup yields snapshot receipt but no false restore claim',()=>{
 const {run,path}=prep();
 try{
  const r=run('--backup-postgres');assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/deadbeef01/);
  assert.match(r.stdout,/Restore test: NOT PERFORMED/);
  assert.doesNotMatch(r.stdout+r.stderr,/TEST_PASSWORD_DO_NOT_LOG/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('remote repository check never claims restore',()=>{
 const {run,path}=prep();
 try{const r=run('--check-repository');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/Restore test: NOT PERFORMED/);}
 finally{rmSync(path,{recursive:true,force:true});}
});
test('unknown actions are rejected',()=>{
 const r=spawnSync(process.execPath,[script,'--DROP_DATABASE'],{encoding:'utf8'});
 assert.equal(r.status,2);assert.doesNotMatch(r.stdout,/created/);
});
test('pg_dump failures never create success receipt',()=>{
 const {env,path}=prep();
 try{
  const r=spawnSync(process.execPath,[script,'--backup-postgres'],{env:{...env,MC_MOCK_PGDUMP_FAIL:'1'},encoding:'utf8'});
  assert.equal(r.status,1);assert.doesNotMatch(r.stdout,/backup created|deadbeef01/i);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('restic upload failures never create success receipt',()=>{
 const {env,path}=prep();
 try{
  const r=spawnSync(process.execPath,[script,'--backup-postgres'],{env:{...env,MC_MOCK_RESTIC_FAIL:'1'},encoding:'utf8'});
  assert.equal(r.status,1);assert.doesNotMatch(r.stdout,/backup created|deadbeef01/i);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('read-only archive inspection never counts as full restore',()=>{
 const {run,path}=prep();
 try{
  const r=run('--inspect-snapshot','deadbeef01','promptence-2026-10-21T12-00-00-000Z.dump');
  assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Database restore test: NOT PERFORMED/);
 }finally{rmSync(path,{recursive:true,force:true});}
});
test('inspection rejects unsafe snapshot selectors',()=>{
 const {run,path}=prep();
 try{
  for(const [id,name] of [['../../etc/passwd','test-2026.dump'],['deadbeef01','../../.env'],['deadbeef01','../x']]){
   const r=run('--inspect-snapshot',id,name);
   assert.equal(r.status,1);assert.doesNotMatch(r.stdout,/inspected successfully/);
  }
 }finally{rmSync(path,{recursive:true,force:true});}
});
