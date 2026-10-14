"""Check the current static publication without requiring the retired Hexo tree."""
import hashlib
import json
import math
import re
from collections import Counter
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
ORIGIN = 'https://spricoder.github.io'


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.references = []
        self.metadata = {}
        self.canonical = None
        self.filters = []
        self.has_article_body = False
        self.h1 = []
        self.in_h1 = False
        self.seen_h1 = False

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if attributes.get('id'):
            self.ids.add(attributes['id'])
        if tag == 'a' and attributes.get('name'):
            self.ids.add(attributes['name'])
        if 'data-pagefind-body' in attributes:
            self.has_article_body = True
        if 'data-pagefind-filter' in attributes:
            self.filters.extend(value.strip() for value in attributes['data-pagefind-filter'].split(',') if value.strip())
        if tag == 'h1' and not self.seen_h1:
            self.in_h1 = True
            self.seen_h1 = True
        if tag == 'meta':
            key = attributes.get('name') or attributes.get('property')
            if key:
                self.metadata[key] = attributes.get('content', '')
            if key in ('og:image', 'twitter:image') and attributes.get('content'):
                self.references.append((tag, 'content', attributes['content']))
        if tag == 'link' and 'canonical' in attributes.get('rel', '').split():
            self.canonical = attributes.get('href')
        for attribute in ('href', 'src', 'poster'):
            if attributes.get(attribute):
                self.references.append((tag, attribute, attributes[attribute]))
        if attributes.get('srcset') and not attributes['srcset'].lstrip().startswith('data:'):
            for candidate in attributes['srcset'].split(','):
                if candidate.strip():
                    self.references.append((tag, 'srcset', candidate.strip().split()[0]))

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        if tag == 'h1':
            self.in_h1 = False

    def handle_data(self, data):
        if self.in_h1:
            self.h1.append(data)


def route(value):
    """Canonical comparison uses decoded paths; filenames themselves stay intact."""
    return unquote(urlsplit(value).path).rstrip('/') + '/'


def published_file(url, base):
    value = urlsplit(urljoin(base, url))
    if value.scheme not in ('http', 'https') or value.netloc != urlsplit(ORIGIN).netloc:
        return None, value
    target = (DIST / unquote(value.path).lstrip('/')).resolve()
    if not target.is_relative_to(DIST.resolve()):
        return None, value
    if target.is_dir() or not target.is_file() and (target / 'index.html').is_file():
        target /= 'index.html'
    return target, value


def valid_date(value):
    try:
        datetime.fromisoformat(value.replace('Z', '+00:00'))
        return True
    except (TypeError, ValueError, AttributeError):
        return False


def image_file(path):
    if not path or not path.is_file():
        return False
    prefix = path.read_bytes()[:256].lstrip()
    return prefix.startswith((b'\x89PNG\r\n\x1a\n', b'\xff\xd8\xff', b'GIF87a', b'GIF89a')) or \
        prefix[:4] == b'RIFF' and prefix[8:12] == b'WEBP' or \
        path.suffix.lower() == '.svg' and (b'<svg' in prefix or prefix.startswith(b'<?xml'))


def main():
    failures = []

    def check(condition, message):
        if not condition:
            failures.append(message)

    check(DIST.is_dir(), 'Build output missing; run the build before the publication check.')
    posts = json.loads((ROOT / 'src/data/posts.json').read_text())
    courses = json.loads((ROOT / 'src/data/courses.json').read_text())
    course_names = {course['slug']: course['name'] for course in courses}
    manifest = json.loads((ROOT / 'content/reference-repairs.json').read_text())
    inherited = json.loads((ROOT / 'migration/inherited-broken-references.json').read_text())
    known = {(item['from'].removeprefix('_posts/'), item['tag'], item['attribute'], item['url']) for item in inherited}
    repair_key = lambda item: (item['id'], item['tag'], item['attribute'], item['url'])
    rules = manifest['repairs'] + manifest['unresolved']
    check(manifest.get('version') == 1, 'Unsupported reference repair manifest version.')
    check(len({repair_key(item) for item in rules}) == len(rules), 'Duplicate reference repair or unresolved rule.')
    for item in rules:
        check(repair_key(item) in known, f"Repair manifest does not identify an inherited reference: {repair_key(item)}")
        check(bool(item.get('evidence')), f"Reference rule has no evidence: {repair_key(item)}")
    unresolved = {repair_key(item): item for item in manifest['unresolved']}
    for item in unresolved.values():
        check(bool(item.get('reason')), f"Unresolved reference has no reason: {repair_key(item)}")
    check({repair_key(item) for item in rules} == known, 'Inherited reference audit is incomplete.')

    by_url = {}
    by_id = {}
    series_orders = {}
    for post in posts:
        check(post['id'] not in by_id, f"Duplicate article id: {post['id']}")
        by_id[post['id']] = post
        check(post['url'].startswith('/') and not post['url'].startswith('//') and not urlsplit(post['url']).query and not urlsplit(post['url']).fragment,
              f"Article URL must be an absolute site path: {post['id']}")
        address = route(post['url'])
        check(address not in by_url, f"Duplicate article URL: {post['url']}")
        by_url[address] = post
        for field in ('title', 'description'):
            check(isinstance(post.get(field), str) and post[field].strip(), f"Missing {field}: {post['id']}")
        for field in ('date', 'updated'):
            check(valid_date(post.get(field)), f"Invalid {field}: {post['id']}")
        if post.get('reviewed'):
            check(valid_date(post['reviewed']), f"Invalid reviewed date: {post['id']}")
        source = (ROOT / post['source']).resolve()
        check(source.is_relative_to((ROOT / 'content/posts').resolve()) and source.is_file(), f"Invalid published source: {post['id']}")
        if source.is_file():
            check(hashlib.sha256(source.read_bytes()).hexdigest() == post['markdown_sha256'], f"Stale generated article data: {post['id']}")
        if post.get('series') and 'series_order' in post:
            order = post['series_order']
            check(isinstance(order, (int, float)) and not isinstance(order, bool) and math.isfinite(order) and order >= 0 and int(order) == order,
                  f"Invalid series order: {post['id']}")
            key = (post['series'], order)
            check(key not in series_orders, f"Duplicate series order {key}: {post['id']}, {series_orders.get(key)}")
            series_orders[key] = post['id']
        target, _ = published_file(post['url'], ORIGIN + '/')
        check(target is not None and target.is_file(), f"Published article URL missing: {post['url']}")

    # Inspect actual draft source locations when available, without requiring local backups in CI.
    draft_ids = set()
    drafts = ROOT / 'content/drafts'
    if drafts.is_dir():
        draft_ids.update(path.relative_to(drafts).as_posix() for path in drafts.rglob('*.md'))
    for source in (ROOT / 'content/posts').rglob('*.md'):
        raw = source.read_text()
        frontmatter = re.match(r'^\ufeff?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)', raw)
        if frontmatter and (re.search(r'^draft:\s*true\s*(?:#.*)?$', frontmatter[1], re.M | re.I) or re.search(r'^published:\s*false\s*(?:#.*)?$', frontmatter[1], re.M | re.I)):
            draft_ids.add(source.relative_to(ROOT / 'content/posts').as_posix())
    for id in draft_ids:
        check(id not in by_id, f"Draft published: {id}")

    documents = {}
    for output in DIST.rglob('*.html'):
        page = Page()
        page.feed(output.read_text())
        documents[output.resolve()] = page

    occurrences = Counter()
    checked_references = 0
    verified_articles = set()
    for output, page in documents.items():
        location = '/' + output.relative_to(DIST).as_posix()
        if location.endswith('/index.html'):
            location = location.removesuffix('index.html')
        base = ORIGIN + location
        post = by_url.get(route(page.canonical)) if page.canonical else None
        if page.has_article_body:
            check(post is not None, f"Article body has no known canonical URL: {location}")
        if post:
            verified_articles.add(post['id'])
            check(page.has_article_body, f"Article has no searchable body: {location}")
            check(''.join(page.h1).strip() == post['title'], f"Article heading does not match metadata: {location}")
            check(page.metadata.get('description') == post['description'], f"Article description does not match metadata: {location}")
            expected = {f"内容类型:{'课程笔记' if post.get('course') else '技术系列' if post.get('series') else '其他文章'}"}
            if post.get('series'):
                expected.add(f"专题:{post['series']}")
            if post.get('course'):
                check(post['course'] in course_names, f"Unknown course: {post['id']}")
                expected.add(f"课程:{course_names.get(post['course'], '')}")
            actual = {item for item in page.filters if item.partition(':')[0] in ('内容类型', '专题', '课程')}
            check(actual == expected, f"Search filters do not match article metadata: {location}; expected={sorted(expected)}, actual={sorted(actual)}")
            for field in ('og:image', 'twitter:image'):
                share, _ = published_file(page.metadata.get(field, ''), base)
                check(bool(page.metadata.get(field)) and image_file(share), f"Missing or invalid local share image ({field}): {location}")
        for tag, attribute, reference in page.references:
            target, value = published_file(reference, base)
            if target is None:
                if value.scheme in ('http', 'https') and value.netloc == urlsplit(ORIGIN).netloc:
                    failures.append(f"Unsafe local reference: {location} -> {reference}")
                continue
            checked_references += 1
            if not target.is_file():
                key = (post['id'] if post else None, tag, attribute, reference)
                if key in unresolved:
                    occurrences[key] += 1
                else:
                    failures.append(f"Missing local reference: {location} <{tag} {attribute}={reference!r}>")
            elif value.fragment and target in documents:
                check(unquote(value.fragment) in documents[target].ids, f"Missing link fragment: {location} -> {reference}")
    check(verified_articles == set(by_id), 'Some published articles are absent from the built canonical pages.')

    for rule in manifest['repairs']:
        check(rule['id'] in by_id, f"Repair article missing: {rule['id']}")
        target, _ = published_file(rule['replacement'], ORIGIN + '/')
        if target is not None:
            check(target.is_file(), f"Repair target missing: {rule['replacement']}")

    # Check fonts and images referenced from the site's stylesheets as well.
    for stylesheet in DIST.rglob('*.css'):
        base = ORIGIN + '/' + stylesheet.relative_to(DIST).as_posix()
        for reference in re.findall(r'url\(\s*["\']?([^\s"\')]+)["\']?\s*\)', stylesheet.read_text()):
            target, _ = published_file(reference, base)
            if target is not None:
                checked_references += 1
                check(target.is_file(), f"Missing stylesheet resource: {stylesheet.relative_to(DIST)} -> {reference}")
    check((DIST / '.nojekyll').is_file(), 'GitHub Pages .nojekyll marker missing.')
    check((DIST / 'pagefind/pagefind.js').is_file(), 'Search index missing.')
    summary = {
        'publishedArticles': len(posts),
        'checkedHtmlPages': len(documents),
        'checkedLocalReferences': checked_references,
        'draftSourcesExcluded': len(draft_ids),
        'auditedReferenceRepairs': len(manifest['repairs']),
        'unresolvedInheritedReferences': [{**item, 'builtOccurrences': occurrences[repair_key(item)]} for item in manifest['unresolved']],
        'failures': failures,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
