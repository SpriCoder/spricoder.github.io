"""Verify copied originals, published body, URLs, assets and backup integrity."""
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote

from lxml import html

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT.parent / 'SpriCoder-Blog'
baseline = json.loads((ROOT / 'migration/baseline.json').read_text())
draft_file = ROOT / 'migration/drafts-local.json'
if draft_file.exists():
    baseline += json.loads(draft_file.read_text())
posts = json.loads((ROOT / 'src/data/posts.json').read_text())
by_id = {post['id']: post for post in posts}
failures = []

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def check(condition, message):
    if not condition:
        failures.append(message)

def inner(node):
    return (node.text or '') + ''.join(html.tostring(child, encoding='unicode', with_tail=True) for child in node)

for item in baseline:
    copied = ROOT / 'content' / ('posts' if item['published'] else 'drafts') / item['id']
    check(copied.exists() and sha(copied) == item['markdown_sha256'], f"Original Markdown changed: {item['id']}")
    if not item['published']:
        check(item['id'] not in by_id, f"Draft published: {item['id']}")
        continue
    post = by_id.get(item['id'])
    check(post is not None, f"Article missing: {item['id']}")
    output = ROOT / 'dist' / post['url'].lstrip('/') / 'index.html'
    check(output.is_file(), f"URL missing: {post['url']}")
    if output.is_file():
        document = html.fromstring(output.read_bytes())
        body = document.xpath('//*[@data-pagefind-body]')
        snapshot = html.fragment_fromstring((ROOT / item['snapshot']).read_text(), create_parent='div')
        check(len(body) == 1 and inner(body[0]) == inner(snapshot), f"Rendered body changed: {post['url']}")
        check(document.xpath('string(//h1)') == post['title'], f"Article title mismatch: {post['url']}")
    for url in item['legacyUrls']:
        check((ROOT / 'dist' / url.lstrip('/')).is_file(), f"Legacy compatibility URL missing: {url}")

assets = json.loads((ROOT / 'migration/assets.json').read_text())
for asset in assets:
    output = ROOT / 'dist' / asset['relative']
    check(output.exists() and sha(output) == asset['sha256'], f"Asset changed: {asset['relative']}")

routes = json.loads((ROOT / 'migration/legacy-routes.json').read_text())
for route in routes:
    check((ROOT / 'dist' / route['url'].lstrip('/') / 'index.html').exists(), f"Listing route missing: {route['url']}")

backup = json.loads((ROOT / 'migration/hexo-backup-manifest.json').read_text())
for file, digest in backup.items():
    original = OLD / file
    check(original.is_file() and sha(original) == digest, f"Hexo backup changed: {file}")

check((ROOT / 'public/js/duration.js').read_bytes() == (OLD / '.deploy_git/js/duration.js').read_bytes(), 'Founding time script changed')
check((ROOT / 'dist/.nojekyll').is_file(), '.nojekyll missing')
check((ROOT / 'dist/pagefind/pagefind.js').is_file(), 'Search index missing')

inherited = json.loads((ROOT / 'migration/inherited-broken-references.json').read_text())
summary = {
    'publishedArticles': len(posts), 'preservedMarkdown': len(baseline),
    'draftsExcluded': sum(not post['published'] for post in baseline),
    'verifiedLegacyListingRoutes': len(routes), 'verifiedLocalImageAssets': len(assets),
    'unchangedHexoBackupFiles': len(backup), 'inheritedBrokenReferences': len(inherited),
    'failures': failures,
}
(ROOT / 'migration/verification.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(summary, ensure_ascii=False))
raise SystemExit(1 if failures else 0)
