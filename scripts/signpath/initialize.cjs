const fs = require('node:fs');
const path = require('node:path');
const c = require('./common.cjs');
const mode=c.mode();
if(mode === 'signpath') {
  if(process.env.GITHUB_REPOSITORY !== 'danimcasas/SITIOO' || process.env.GITHUB_REF !== 'refs/heads/main' || process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || process.env.RUNNER_ENVIRONMENT !== 'github-hosted') throw new Error('Production signing requires a manual build of main on GitHub-hosted Windows.');
  for(const name of ['SIGNPATH_ORGANIZATION_ID','SIGNPATH_PROJECT_SLUG','SIGNPATH_SIGNING_POLICY_SLUG','SIGNPATH_API_TOKEN','SIGNPATH_CERTIFICATE_SHA256']) if(!process.env[name]) throw new Error(`Missing ${name}; signing cannot start.`);
  if(process.env.SIGNPATH_SIGNING_POLICY_SLUG !== 'release-signing') throw new Error('Only release-signing with manual SignPath approval is allowed.');
}
fs.mkdirSync(c.workspace()); // Each run uses a new workspace; no stale signing responses.
c.writeNewJson(path.join(c.workspace(), 'context.json'), {version:c.version, mode, commit:process.env.GITHUB_SHA || 'local', run:process.env.GITHUB_RUN_ID || 'local'});
const installerSource=fs.readFileSync(path.join(c.root,'config/installer.nsh'),'utf8');
if(!installerSource.includes('Beta sin firma digital.'))throw new Error('Review installer signing notice before building.');
fs.writeFileSync(path.join(c.workspace(),'installer.nsh'),mode==='signpath'?installerSource.replace('Beta sin firma digital.','Beta con firma digital verificada.'):installerSource,{flag:'wx'});
console.log(`Initialized ${mode}; SITIOO ${c.version}.`);
