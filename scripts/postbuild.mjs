import fs from 'node:fs';
import path from 'node:path';

const baseline = JSON.parse(fs.readFileSync('migration/baseline.json', 'utf8'));
for (const post of baseline.filter(post => post.published)) {
  for (const legacyUrl of post.legacyUrls || []) {
    const destination = path.join('dist', decodeURI(legacyUrl).replace(/^\//, ''));
    if (fs.existsSync(destination) && fs.statSync(destination).isFile()) fs.unlinkSync(destination);
    fs.mkdirSync(destination, { recursive: true });
    // A directory index gives the old extensionless address an HTML response.
    fs.copyFileSync(path.join('dist', post.url, 'index.html'), path.join(destination, 'index.html'));
  }
}
console.log('Legacy URL compatibility files ready.');
