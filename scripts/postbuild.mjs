import fs from 'node:fs';
import path from 'node:path';

const baseline = JSON.parse(fs.readFileSync('migration/baseline.json', 'utf8'));
for (const post of baseline.filter(post => post.published)) {
  for (const legacyUrl of post.legacyUrls || []) {
    const destination = path.join('dist', decodeURI(legacyUrl).replace(/^\//, ''));
    if (fs.existsSync(destination) && fs.statSync(destination).isDirectory()) continue;
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    // Preserve the old extensionless document, including query-string links to it.
    fs.copyFileSync(path.join('dist', post.url, 'index.html'), destination);
  }
}
console.log('Legacy URL compatibility files ready.');
