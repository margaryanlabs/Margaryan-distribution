/**
 * Public staging identity ONLY when an owner explicitly configures all fields.
 * Self-reported release metadata, NOT signed artifact attestation or uptime.
 */
export type StagingReleaseMarker={
 schema:'markarian-staging-release/v1';environment:'staging';
 project:'margaryan-cloud';repository:'margaryanlabs/Margaryan-distribution';commit:string
};
const SHA=/^[a-f0-9]{40}$/;
export function stagingReleaseMarker(env:Record<string,string|undefined>):StagingReleaseMarker|null{
 if(env.CLOUD_STAGING_MARKER_ENABLED!=='staging-only'||
    env.CLOUD_STAGE_ENVIRONMENT!=='staging'||
    env.CLOUD_STAGE_PROJECT!=='margaryan-cloud'||
    env.CLOUD_STAGE_REPOSITORY!=='margaryanlabs/Margaryan-distribution'||
    !SHA.test(env.CLOUD_STAGE_COMMIT_SHA||''))return null;
 return {schema:'markarian-staging-release/v1',environment:'staging',
  project:'margaryan-cloud',repository:'margaryanlabs/Margaryan-distribution',
  commit:env.CLOUD_STAGE_COMMIT_SHA as string};
}
