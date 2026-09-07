"""Read-only availability and CORS probe; no customer data or write endpoints."""
import datetime
import json
import urllib.error
import urllib.request
from pathlib import Path

URL = 'https://hub.centaur-lang.dev/webhook/check-availability'
date = datetime.date.today() + datetime.timedelta(days=1)
payload = {'city': 'gyor', 'startDate': str(date), 'endDate': str(date + datetime.timedelta(days=7)), 'requiredDuration': 40}
for method in ('OPTIONS', 'POST'):
    headers = {'Origin': 'https://ecocleantisztito.hu', 'User-Agent': 'Mozilla/5.0'}
    if method == 'OPTIONS':
        headers.update({'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type'})
    else:
        headers['Content-Type'] = 'application/json'
    request = urllib.request.Request(URL, data=json.dumps(payload).encode() if method == 'POST' else None, method=method, headers=headers)
    try:
        response = urllib.request.urlopen(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    except urllib.error.URLError as error:
        print(json.dumps({'method': method, 'networkError': str(error.reason)}))
        continue
    body = response.read()
    summary = {'method': method, 'status': response.status, 'contentType': response.headers.get('Content-Type'), 'server': response.headers.get('Server'), 'corsOrigin': response.headers.get('Access-Control-Allow-Origin'), 'corsMethods': response.headers.get('Access-Control-Allow-Methods'), 'corsHeaders': response.headers.get('Access-Control-Allow-Headers'), 'responseBytes': len(body)}
    try:
        data = json.loads(body)
        summary.update({'json': True, 'keys': list(data) if isinstance(data, dict) else ['non-object']})
        if isinstance(data, dict) and isinstance(data.get('days'), list):
            summary['daysCount'] = len(data['days'])
            summary['dayKeys'] = list(data['days'][0]) if data['days'] else []
            summary['slotKeys'] = list(next((slot for day in data['days'] for slot in day.get('slots', [])), {}))
            summary['statuses'] = sorted(set(day.get('status', '') for day in data['days']))
            # Persist only availability fields consumed by the frontend. Omit bookingInfo,
            # request metadata and all backend/customer identifiers from the evidence.
            safe = {'success': data.get('success'), 'days': [{
                'date': day.get('date'), 'status': day.get('status'),
                'slots': [{key: slot.get(key) for key in ('startMinutes', 'startTime', 'endTime', 'maxDuration', 'status', 'isFirstSlot', 'fitsRequested')}
                          for slot in day.get('slots', [])]
            } for day in data['days']]}
            target = Path(__file__).resolve().parent / 'tests' / 'booking-live-availability.json'
            target.write_text(json.dumps(safe, ensure_ascii=False, indent=2), encoding='utf-8')
    except (ValueError, TypeError):
        summary['json'] = False
        summary['accessDeniedText'] = b'Forbidden' in body or b'Access denied' in body or b'cloudflare' in body.lower()
    print(json.dumps(summary))
