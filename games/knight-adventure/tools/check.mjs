/* Portable, dependency-free gameplay checks. These VM checks do not replace
 * browser screenshots, real frame-time measurements, or a manual playtest. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.resolve(process.env.KNIGHT_QA_DIR || path.join(repo, '.qa-local'));
if(process.argv.includes('--syntax')) {
  const files=fs.readdirSync(path.join(repo,'dist')).filter(f=>f.endsWith('.js'));
  for(const file of files){const r=spawnSync(process.execPath,['--check',path.join(repo,'dist',file)],{encoding:'utf8',windowsHide:true});if(r.status!==0){console.error(r.stderr);process.exit(1);}}
  const html=fs.readFileSync(path.join(repo,'dist/index.html'),'utf8');
  for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){const target=match[1].split('?')[0];if(/^(?:https?:|data:)/.test(target))continue;if(!fs.existsSync(path.join(repo,'dist',target))){console.error('Missing entry asset: '+target);process.exit(1);}}
  console.log('PASS syntax '+files.length+' scripts and HTML entry references');process.exit(0);
}
const suites = [
  'solo-combat-qa.cjs',
  'adventure-module-check.cjs',
  'basketball-check.cjs',
  'new-stage-rules-check.cjs',
  'combat-refinement-check.cjs'
];
if (fs.existsSync(path.join(repo, 'tools', 'showcase-check.cjs'))) suites.push('showcase-check.cjs');
else console.log('SKIP showcase-check: not present; four gameplay suites will run.');

try {
  fs.mkdirSync(reportDir, {recursive:true});
} catch (error) {
  console.error('Cannot create QA report directory: ' + error.message);
  process.exit(1);
}

let failedSuites = 0, passedCases = 0, totalCases = 0;
for (const file of suites) {
  const name = path.basename(file, path.extname(file));
  const result = spawnSync(process.execPath, [path.join(repo, 'tools', file)], {
    cwd:repo,
    env:{...process.env, KNIGHT_QA_DIR:reportDir},
    encoding:'utf8',
    windowsHide:true,
    maxBuffer:10 * 1024 * 1024
  });
  let report;
  try { report = JSON.parse((result.stdout || '').trim()); } catch {}
  const cases = Array.isArray(report?.checks) ? report.checks : [];
  const validReport = cases.length > 0 && cases.every(check => typeof check.name === 'string');
  const failures = cases.filter(check => check.ok === false || check.pass === false);
  const passed = Number.isFinite(report?.passed) ? report.passed : cases.length - failures.length;
  const failed = Number.isFinite(report?.failed) ? report.failed : failures.length;
  const ok = !result.error && result.status === 0 && validReport && failed === 0 && failures.length === 0;
  passedCases += passed; totalCases += passed + failed;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${passed}/${passed + failed} cases`);
  if (!ok) {
    failedSuites++;
    for (const check of failures) {
      console.error(`  Case: ${check.name || '(unnamed)'}`);
      console.error(check.error || JSON.stringify(check.details || check));
    }
    if (result.error) console.error(result.error.stack || result.error.message);
    if (result.signal) console.error('  Terminated by signal: ' + result.signal);
    if (result.stderr?.trim()) console.error(result.stderr.trim());
    if (!report && result.stdout?.trim()) console.error(result.stdout.trim());
    if (!report) console.error('  Suite did not produce a JSON report.');
    else if (!validReport) console.error('  Suite report has no named check cases.');
    else if (!failures.length) console.error(`  Suite exited with status ${result.status}; reported failed cases: ${failed}.`);
  }
}
console.log(`${suites.length - failedSuites}/${suites.length} suites passed; ${passedCases}/${totalCases} cases passed.`);
console.log('Reports: ' + reportDir);
if (failedSuites) process.exitCode = 1;
