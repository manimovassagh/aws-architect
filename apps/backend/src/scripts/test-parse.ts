import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseTfstate } from '../parser/tfstate.js';
import { buildGraph } from '../parser/graph.js';

const fixturePath = resolve(
  new URL('.', import.meta.url).pathname,
  '../fixtures/sample.tfstate'
);

const raw = readFileSync(fixturePath, 'utf-8');
const tfstate = parseTfstate(raw);
const result = buildGraph(tfstate);

console.log('\n─── Summary ──────────────────────────────────────');
console.log(`nodeCount:     ${result.nodes.length}`);
console.log(`edgeCount:     ${result.edges.length}`);
console.log(`resourceCount: ${result.resources.length}`);
console.log(`warnings:      ${JSON.stringify(result.warnings)}`);

console.log('\n─── Nodes ────────────────────────────────────────');
for (const node of result.nodes) {
  const parent = node.parentNode ? `  → parent: ${node.parentNode}` : '';
  console.log(`  ${node.id.padEnd(40)} type: ${node.type}${parent}`);
}

console.log('\n─── Edges ────────────────────────────────────────');
for (const edge of result.edges) {
  console.log(`  ${edge.source.padEnd(35)} → ${edge.target.padEnd(35)} [${edge.label}]`);
}

// ─── Verification checklist ───────────────────────────────────────────────────
console.log('\n─── Verification ─────────────────────────────────');

const checks: [string, boolean][] = [
  ['nodeCount >= 10', result.nodes.length >= 10],
  ['edgeCount >= 3',  result.edges.length >= 3],
  [
    'VPC has no parentNode',
    result.nodes.filter((n) => n.type === 'vpcNode').every((n) => !n.parentNode),
  ],
  [
    'Both subnets have parentNode === aws_vpc.main',
    result.nodes
      .filter((n) => n.type === 'subnetNode')
      .every((n) => n.parentNode === 'aws_vpc.main'),
  ],
  [
    'EC2 (web) has parentNode === aws_subnet.public_1',
    result.nodes.some(
      (n) => n.id === 'aws_instance.web' && n.parentNode === 'aws_subnet.public_1'
    ),
  ],
  [
    'S3 (assets) has no parentNode',
    result.nodes.some((n) => n.id === 'aws_s3_bucket.assets' && !n.parentNode),
  ],
  ['No duplicate edges', (() => {
    const keys = result.edges.map((e) => `${e.source}|${e.target}`);
    return new Set(keys).size === keys.length;
  })()],
  ['warnings is empty', result.warnings.length === 0],
];

let allPassed = true;
for (const [label, passed] of checks) {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${label}`);
  if (!passed) allPassed = false;
}

console.log('');
if (allPassed) {
  console.log('All checks passed — ready to commit.');
} else {
  console.error('Some checks failed.');
  process.exit(1);
}
