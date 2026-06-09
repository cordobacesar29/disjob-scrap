import json
import re
from collections import Counter

nav_path = 'disjob_output/navigation_log_FINAL_2026-06-08T17-44-30-035Z.json'
net_path = 'disjob_output/network_traffic_FINAL_2026-06-08T17-44-30-035Z.json'

with open(nav_path, 'r', encoding='utf-8') as f:
    nav = json.load(f)
with open(net_path, 'r', encoding='utf-8') as f:
    net = json.load(f)

urls = [entry.get('url') for entry in nav if 'url' in entry]
print('NAV pages total', len(nav))
print('\nTop visited page URLs:')
for u, c in Counter(urls).most_common(30):
    print(c, u)

print('\nDistinct page base paths:')
base_paths = [re.sub(r'\?.*$', '', u) for u in urls if u]
for u, c in Counter(base_paths).most_common(30):
    print(c, u)

print('\nDISJOB relevant requests:')
for entry in net:
    url = entry.get('url','')
    if 'disjob.com' not in url:
        continue
    if any(skip in url for skip in ['google-analytics.com','googletagmanager.com','youtube.com','facebook.net','doubleclick.net','gstatic.com','google.com/js']) :
        continue
    if entry.get('resourceType') in ('document','xhr','fetch') or entry.get('method') == 'POST':
        print(entry.get('id'), entry.get('method'), entry.get('resourceType'), url)

print('\nDISJOB POST actions (first 50):')
count = 0
for entry in net:
    url = entry.get('url','')
    if 'disjob.com' in url and entry.get('method') == 'POST':
        print(entry.get('id'), url, entry.get('payload'), entry.get('resourceType'))
        count += 1
        if count >= 50:
            break
