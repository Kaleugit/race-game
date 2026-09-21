// Generates the height fixture from the PRE-MIGRATION trackHeight (src/main.js @ d399713, lines 38-157).
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const src = execSync('git show d399713:src/main.js', { encoding: 'utf8' }).split(/\r?\n/);
const body = src.slice(37, 157).join('\n');
if (!body.startsWith('const SLOPES') || !body.trimEnd().endsWith('}')) throw new Error('unexpected slice');
const trackHeight = new Function(body + '\nreturn trackHeight;')();
const points = [];
for (let i = 0; i <= (900 - -40) * 2; i++) { const x = -40 + i * 0.5; points.push([x, trackHeight(x)]); }
writeFileSync(process.argv[2], JSON.stringify({
  source: 'src/main.js@d399713 trackHeight (lines 38-157)', xFrom: -40, xTo: 900, step: 0.5, points,
}, null, 0) + '\n');
console.log('points', points.length, 'last', points.at(-1));
