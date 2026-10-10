'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
  cwd: root,
  encoding: 'utf8',
}).split('\0').filter(Boolean);

const allowedSensitiveNames = new Set(['.env.example']);
const sensitiveName = /(^|\/)(\.env(?:\..+)?|\.credentials\.json|credentials\.json|secrets\.json|auth\.json)$|\.(pem|key|p12|pfx|jks|keystore|mobileprovision)$/i;
const signatures = [
  ['Anthropic API key', new RegExp('sk-' + 'ant-[A-Za-z0-9_-]{10,}', 'g')],
  ['OpenAI-style API key', new RegExp('sk-' + '[A-Za-z0-9_-]{20,}', 'g')],
  ['GitHub token', new RegExp('gh' + '[pousr]_[A-Za-z0-9]{20,}', 'g')],
  ['GitHub fine-grained token', new RegExp('github_' + 'pat_[A-Za-z0-9_]{20,}', 'g')],
  ['Private key', new RegExp('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----', 'g')],
  ['Serialized access token', new RegExp('["\\\']accessToken["\\\']\\s*:\\s*["\\\'][A-Za-z0-9._-]{20,}["\\\']', 'g')],
  ['Bearer token', new RegExp('Authorization\\s*[:=]\\s*["\\\']?Bearer [A-Za-z0-9._-]{20,}', 'gi')],
];

const findings = [];

function scanText(location, value) {
  for (const [label, signature] of signatures) {
    signature.lastIndex = 0;
    if (signature.test(value)) findings.push(`${location}: possible ${label}`);
  }
}

for (const relative of tracked) {
  const normalized = relative.replaceAll('\\\\', '/');
  if (sensitiveName.test(normalized) && !allowedSensitiveNames.has(path.basename(normalized))) {
    findings.push(`${relative}: sensitive filename is tracked`);
  }

  const absolute = path.join(root, relative);
  let value;
  try {
    const bytes = fs.readFileSync(absolute);
    if (bytes.includes(0) || bytes.length > 2 * 1024 * 1024) continue;
    value = bytes.toString('utf8');
  } catch {
    continue;
  }

  scanText(relative, value);
}

// A clean current tree is insufficient if a credential remains retrievable from history.
try {
  const history = execFileSync('git', ['log', '-p', '--all', '--no-ext-diff', '--no-textconv'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  scanText('Git history', history);
} catch {
  findings.push('Git history: could not be inspected');
}

if (findings.length) {
  console.error('Potential secrets detected. Values are intentionally not printed:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(`Secret check passed (${tracked.length} repository files and Git history inspected).`);
}
