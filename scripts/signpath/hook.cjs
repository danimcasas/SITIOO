// electron-builder custom signer. Only the three exact project paths are accepted.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');
const c = require('./common.cjs');
function verify(file, signed) {
  execFileSync('pwsh', ['-NoProfile', '-File', path.join(__dirname, 'verify-file.ps1'), '-Path', file, ...(signed ? ['-RequireSignature'] : [])], {stdio:'inherit', windowsHide:true});
}
async function normalizeApplicationVersion(file) {
  const {NtExecutable, NtExecutableResource, Resource} = require('resedit');
  const exe = NtExecutable.from(fs.readFileSync(file));
  const resources = NtExecutableResource.from(exe);
  const versions = Resource.VersionInfo.fromEntries(resources.entries);
  if (versions.length !== 1) throw new Error('Unexpected application version resource.');
  versions[0].setProductVersion(c.numericVersion);
  for (const lang of versions[0].getAllLanguagesForStringValues()) versions[0].setStringValues(lang, {ProductVersion:c.version});
  versions[0].outputToResourceEntries(resources.entries);
  resources.outputResource(exe);
  fs.writeFileSync(file, Buffer.from(exe.generate()));
}
module.exports = async function sign(configuration) {
  const stage = c.stageFor(configuration.path);
  if (configuration.hash !== 'sha256' || configuration.isNest) throw new Error('Only one SHA-256 signature is allowed.');
  const selectedMode = c.mode();
  if (stage === 'application') await normalizeApplicationVersion(configuration.path);
  verify(configuration.path, false);
  const folder = path.join(c.workspace(), stage);
  fs.mkdirSync(folder); // A repeated stage is an error, never an overwrite.
  const input = path.join(folder, path.basename(configuration.path));
  fs.copyFileSync(configuration.path, input, fs.constants.COPYFILE_EXCL);
  c.writeNewJson(path.join(folder, 'request.json'), {stage, file:path.basename(input), sha256:c.sha256(input), version:c.version});
  if (selectedMode === 'rehearsal') return; // Explicit unsigned rehearsal, never a production fallback.
  const response = path.join(folder, 'approved.json');
  const deadline = Date.now() + 45 * 60 * 1000;
  while (!fs.existsSync(response)) {
    if (Date.now() > deadline) throw new Error(`Signing timed out at ${stage}.`);
    await delay(2000);
  }
  const signedFile = path.join(folder, 'signed', path.basename(input));
  const approval = JSON.parse(fs.readFileSync(response, 'utf8'));
  if (approval.input !== c.sha256(input) || approval.output !== c.sha256(signedFile)) throw new Error('Signing response does not match this request.');
  if (!c.samePayload(fs.readFileSync(input), fs.readFileSync(signedFile))) throw new Error('Signed file changed executable content.');
  verify(signedFile, true);
  fs.copyFileSync(signedFile, configuration.path);
};
