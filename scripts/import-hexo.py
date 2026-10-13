"""One-time, read-only import of the preserved Hexo site."""
import hashlib
import json
import shutil
from pathlib import Path

from lxml import html

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT.parent / 'SpriCoder-Blog'
audit = json.loads(Path('/private/tmp/blog-astro-migration-audit.json').read_text())

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

baseline = []
for item in audit['posts']:
    source = OLD / 'source' / item['source']
    target = ROOT / 'content' / ('posts' if item['published'] else 'drafts') / item['id']
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    assert sha(target) == item['markdown_sha256']
    record = {k: v for k, v in item.items() if k not in ['html', 'legacySnapshotFile', 'deployed_file']}
    if item['published']:
        snapshot = 'content/legacy/' + hashlib.sha256(item['id'].encode()).hexdigest()[:24] + '.html'
        destination = ROOT / snapshot
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(item['html'])
        record['snapshot'] = snapshot
        assert sha(destination) == item['snapshot_sha256']
    baseline.append(record)

about = audit['about']
about_target = ROOT / 'content/about/index.md'
about_target.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(OLD / 'source/about/index.md', about_target)
(ROOT / 'content/legacy/about.html').write_text(about['html'])
write_json(ROOT / 'migration/about.json', {k: v for k, v in about.items() if k not in ['html', 'legacySnapshotFile']})

for folder in ['img', 'images', 'css', 'xml']:
    if (OLD / '.deploy_git' / folder).exists():
        shutil.copytree(OLD / '.deploy_git' / folder, ROOT / 'public' / folder, dirs_exist_ok=True)
(ROOT / 'public/js').mkdir(parents=True, exist_ok=True)
shutil.copy2(OLD / '.deploy_git/js/duration.js', ROOT / 'public/js/duration.js')

# The settings are the same public client configuration already served by Hexo.
analytics = json.loads(Path('/private/tmp/blog-deployed-analytics.json').read_text())
write_json(ROOT / 'src/data/analytics.json', {'enable': analytics['enable'], 'leancloud': analytics['leancloud']})

published_urls = {item['url'] for item in baseline if item['published']}
legacy_routes = []
for file in (OLD / '.deploy_git').rglob('index.html'):
    relative = file.relative_to(OLD / '.deploy_git').as_posix()
    if relative.startswith('.git/'):
        continue
    route = '/' + relative.removesuffix('index.html')
    if route in published_urls or route in ['/', '/about/']:
        continue
    root = html.fromstring(file.read_bytes())
    title = root.xpath('string(//title)').replace(' - SpriCoder的博客', '')
    kind = route.split('/')[1]
    if kind in ['tags', 'categories', 'archives', 'page', 'links']:
        legacy_routes.append({'url': route, 'title': title, 'kind': kind})

write_json(ROOT / 'migration/baseline.json', [record for record in baseline if record['published']])
write_json(ROOT / 'migration/drafts-local.json', [record for record in baseline if not record['published']])
write_json(ROOT / 'migration/legacy-routes.json', legacy_routes)
write_json(ROOT / 'migration/assets.json', [{k: v for k, v in item.items() if k != 'source'} for item in audit['assets']])
write_json(ROOT / 'migration/inherited-broken-references.json', audit['inheritedBrokenReferences'])
write_json(ROOT / 'migration/post-link-tags.json', json.loads(Path('/private/tmp/blog-astro-post-link-tags.json').read_text()))

backup = {}
for path in OLD.rglob('*'):
    relative = path.relative_to(OLD).as_posix()
    if path.is_file() and not any(part in ['node_modules', '.git'] for part in path.relative_to(OLD).parts):
        backup[relative] = sha(path)
write_json(ROOT / 'migration/hexo-backup-manifest.json', backup)
print(json.dumps({'articles': len([p for p in baseline if p['published']]), 'drafts': len([p for p in baseline if not p['published']]), 'legacyListingRoutes': len(legacy_routes), 'backupFiles': len(backup)}))
