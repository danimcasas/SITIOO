// GPL-2.0-or-later. No network calls or credentials in this module.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const version = require('../../package.json').version;
const match = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(version);
if (!match) throw new Error('Unsupported version for the Windows signing pipeline.');
const numericVersion = match.slice(1).map(v => Number(v || 0)).join('.');
const installerName = `SITIOO-${version}-windows-x64-setup.exe`;
function mode() {
  const value = process.env.SITIOO_SIGNING_MODE;
  if (!['rehearsal', 'signpath'].includes(value)) throw new Error('Select rehearsal or signpath explicitly.');
  return value;
}
function workspace() {
  const value = process.env.SITIOO_SIGNING_DIR;
  if (!value) throw new Error('SITIOO_SIGNING_DIR is required.');
  const resolved = path.resolve(value);
  if (!resolved.startsWith(path.join(root, '.local') + path.sep)) throw new Error('Signing workspace must be under .local.');
  return resolved;
}
function stageFor(file) {
  const target = path.resolve(file);
  const output = path.join(workspace(), 'build');
  if (target === path.join(output, 'win-unpacked', 'SITIOO.exe')) return 'application';
  if (target === path.join(output, installerName.replace(/exe$/, '__uninstaller.exe'))) return 'uninstaller';
  if (target === path.join(output, installerName)) return 'installer';
  throw new Error(`Signing forbidden for ${path.basename(file)}.`);
}
function sha256(file) { return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function writeNewJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
}
// Authenticode changes only checksum, certificate directory, alignment padding and certificate bytes.
// The remaining PE bytes must be identical to the submitted file.
function unsignedBody(buffer) {
  if (buffer.length < 256 || buffer.toString('ascii', 0, 2) !== 'MZ') throw new Error('Invalid PE file.');
  const pe = buffer.readUInt32LE(60);
  if (pe + 264 > buffer.length || buffer.toString('ascii', pe, pe + 4) !== 'PE\0\0') throw new Error('Invalid PE header.');
  const optional = pe + 24;
  const magic = buffer.readUInt16LE(optional);
  if (![0x10b, 0x20b].includes(magic)) throw new Error('Invalid optional PE header.');
  const certificate = optional + (magic === 0x20b ? 112 : 96) + 32;
  const start = buffer.readUInt32LE(certificate);
  const length = buffer.readUInt32LE(certificate + 4);
  if ((start === 0) !== (length === 0) || (start && (start < certificate + 8 || start + length !== buffer.length))) throw new Error('Invalid or non-terminal certificate table.');
  const body = Buffer.from(buffer.subarray(0, start || buffer.length));
  body.fill(0, optional + 64, optional + 68);
  body.fill(0, certificate, certificate + 8);
  return body;
}
function samePayload(before, after) {
  const a = unsignedBody(before), b = unsignedBody(after);
  if (b.length < a.length || b.length - a.length > 7 || !b.subarray(0, a.length).equals(a)) return false;
  return b.subarray(a.length).every(value => value === 0);
}
module.exports = {root, version, numericVersion, installerName, mode, workspace, stageFor, sha256, writeNewJson, samePayload};
