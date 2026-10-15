const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {setTimeout: delay} = require('node:timers/promises');
const c = require('./common.cjs');
async function main() {
  const [command, stage] = process.argv.slice(2);
  c.mode();
  if (!['native', 'application', 'uninstaller', 'installer', 'completed'].includes(stage)) throw new Error('Unknown stage.');
  if (command === 'wait') {
    const target = stage === 'completed' ? path.join(c.workspace(), 'completed.json') : path.join(c.workspace(), stage, 'request.json');
    const deadline = Date.now() + 30 * 60 * 1000;
    let nextProgress = 0;
    while (!fs.existsSync(target)) {
      if (fs.existsSync(path.join(c.workspace(), 'failed.json'))) throw new Error('Packaging failed; inspect build log.');
      const pidFile = path.join(c.workspace(), 'build.pid');
      if (fs.existsSync(pidFile)) {
        const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
        if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error('Invalid packager process identifier.');
        try { process.kill(pid, 0); } catch { throw new Error(`Packager stopped before ${stage}; inspect build log.`); }
      }
      if (Date.now() > deadline) throw new Error(`Timed out waiting for ${stage}.`);
      if (Date.now() >= nextProgress) {
        console.log(`Waiting for ${stage}.`);
        for (const name of ['build.stdout.log', 'build.stderr.log']) {
          const file = path.join(c.workspace(), name);
          if (fs.existsSync(file)) console.log(fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).slice(-3).join('\n'));
        }
        nextProgress = Date.now() + 60000;
      }
      await delay(2000);
    }
    console.log(`Stage ready: ${stage}`);
    return;
  }
  if (command !== 'accept' || stage === 'completed' || c.mode() !== 'signpath') throw new Error('Unexpected command or mode.');
  const folder=path.join(c.workspace(), stage);
  const request=JSON.parse(fs.readFileSync(path.join(folder, 'request.json'), 'utf8'));
  if (request.file !== path.basename(request.file) || request.stage !== stage || request.version !== c.version) throw new Error('Invalid stage request.');
  const input=path.join(folder, request.file), signed=path.join(folder, 'signed', request.file);
  if (c.sha256(input) !== request.sha256 || !c.samePayload(fs.readFileSync(input), fs.readFileSync(signed))) throw new Error('Input or signed payload mismatch.');
  execFileSync('pwsh', ['-NoProfile', '-File', path.join(__dirname, 'verify-file.ps1'), '-Path', signed, '-RequireSignature'], {stdio:'inherit', windowsHide:true});
  c.writeNewJson(path.join(folder, 'approved.json'), {input:request.sha256, output:c.sha256(signed)});
  if (stage === 'native') {
    fs.copyFileSync(signed, path.join(c.root, '.local/native/sitioo-win.exe'));
    fs.copyFileSync(signed, path.join(c.root, 'plugins/sitioo-migration/bin/sitioo-win.exe'));
  }
}
main().catch(error => {console.error(error.message); process.exitCode=1;});
