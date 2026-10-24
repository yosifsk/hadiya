/* يشغّل كل ملفات الاختبار واحدًا واحدًا ويطبع ملخصًا (لتحديد الملف الفاشل) */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const dir = path.join(ROOT, 'tests');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort();

let totalPass = 0;
let totalFail = 0;
const failedFiles = [];

for (const file of files) {
  let out = '';
  try {
    out = execFileSync(process.execPath, ['--test', path.join(dir, file)], { encoding: 'utf8', cwd: ROOT });
  } catch (err) {
    out = (err.stdout || '') + (err.stderr || '');
  }
  const pass = Number((out.match(/pass (\d+)/) || [0, 0])[1]);
  const fail = Number((out.match(/fail (\d+)/) || [0, 0])[1]);
  totalPass += pass;
  totalFail += fail;
  const status = fail === 0 ? 'OK  ' : 'FAIL';
  console.log(`${status} ${file.padEnd(22)} pass=${pass} fail=${fail}`);
  if (fail > 0) {
    failedFiles.push(file);
    const detail = out.split('\n').filter(l => l.includes('✖') || l.includes('AssertionError') || l.includes('Error:')).slice(0, 6);
    for (const d of detail) console.log(`     ${d.trim().slice(0, 160)}`);
  }
}

console.log(`\nTOTAL pass=${totalPass} fail=${totalFail}`);
if (failedFiles.length) {
  console.log('FAILED FILES:', failedFiles.join(', '));
  process.exit(1);
}
