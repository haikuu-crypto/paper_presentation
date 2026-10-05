import urllib.request
import json
import http.cookiejar

# Setup cookie jar for session tracking
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. Test Home page
resp = opener.open('http://127.0.0.1:5000/')
html = resp.read().decode('utf-8')
assert '<title>DocTrust' in html
print('[PASS] Home page loaded with DocTrust title')

# 2. Test Citizen Login
login_data = json.dumps({'email': 'rajesh.kumar@gmail.com', 'password': 'Citizen@123'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:5000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = opener.open(req)
res = json.loads(resp.read().decode('utf-8'))
assert res['success'] is True
print(f"[PASS] Citizen Login: {res['user']['full_name']} ({res['user']['email']})")

# 3. Test Citizen Documents
resp = opener.open('http://127.0.0.1:5000/api/documents')
docs_res = json.loads(resp.read().decode('utf-8'))
assert docs_res['success'] is True
print(f"[PASS] Citizen Documents loaded: {len(docs_res['documents'])} documents")
first_doc = docs_res['documents'][0]

# 4. Test SHA-256 Live Hash Verification
resp = opener.open(f"http://127.0.0.1:5000/api/documents/{first_doc['id']}/verify-hash")
verify_res = json.loads(resp.read().decode('utf-8'))
assert verify_res['success'] is True
assert verify_res['is_tamper_free'] is True
print(f"[PASS] SHA-256 Integrity Verification: {verify_res['status']}")

# 5. Test Incoming Document Requests
resp = opener.open('http://127.0.0.1:5000/api/requests')
reqs_res = json.loads(resp.read().decode('utf-8'))
assert reqs_res['success'] is True
print(f"[PASS] Citizen Requests retrieved: {len(reqs_res['requests'])} requests")

# 6. Switch to Admin Login
admin_login = json.dumps({'role': 'admin'}).encode('utf-8')
req = urllib.request.Request('http://127.0.0.1:5000/api/auth/demo-login', data=admin_login, headers={'Content-Type': 'application/json'})
resp = opener.open(req)
admin_res = json.loads(resp.read().decode('utf-8'))
assert admin_res['success'] is True
print(f"[PASS] Admin Demo Login: {admin_res['user']['full_name']}")

# 7. Test Admin Stats
resp = opener.open('http://127.0.0.1:5000/api/admin/stats')
stats_res = json.loads(resp.read().decode('utf-8'))
assert stats_res['success'] is True
print(f"[PASS] Admin Stats retrieved: {stats_res['stats']}")

# 8. Test Admin Audit Logs
resp = opener.open('http://127.0.0.1:5000/api/admin/audit-logs')
audit_res = json.loads(resp.read().decode('utf-8'))
assert audit_res['success'] is True
print(f"[PASS] Admin Audit Logs retrieved: {len(audit_res['logs'])} events recorded")

print("\nALL SYSTEM & SECURITY TESTS PASSED PERFECTLY!")
