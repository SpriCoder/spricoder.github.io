"""Read counters without creating or incrementing any record."""
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

root = Path(__file__).resolve().parents[1]
config = json.loads((root / 'src/data/analytics.json').read_text())['leancloud']
base = config.get('server_url')
if not base:
    route = 'https://app-router.leancloud.cn/2/route?appId=' + urllib.parse.quote(config['app_id'])
    with urllib.request.urlopen(route, timeout=20) as response:
        base = json.load(response)['api_server']
if not base.startswith('http'):
    base = 'https://' + base
result = {}
for target in ['site-pv', 'site-uv']:
    url = base.rstrip('/') + '/1.1/classes/Counter?where=' + urllib.parse.quote(json.dumps({'target': target}))
    request = urllib.request.Request(url, headers={'X-LC-Id': config['app_id'], 'X-LC-Key': config['app_key']})
    with urllib.request.urlopen(request, timeout=20) as response:
        records = json.load(response).get('results', [])
    result[target] = [{key: record.get(key) for key in ['objectId', 'target', 'time']} for record in records]
if len(sys.argv) > 1:
    Path(sys.argv[1]).write_text(json.dumps(result))
print(json.dumps({target: {'records': len(records), 'mainCount': records[0]['time'] if records else None} for target, records in result.items()}))
