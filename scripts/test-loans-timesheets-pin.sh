#!/usr/bin/env bash
# E2E test for: hashed-PIN login, rate limiting, new Loans + Timesheets tabs.
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi; }

echo "== 1. login with hashed PIN still works =="
LOGIN=$(curl -s -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1002","pin":"1002"}')
TOKEN=$(printf '%s' "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
ENO=$(printf '%s' "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("employee",{}).get("employeeNo",""))')
check "login succeeds with hashed PIN" "MS-1002" "$ENO"
[ -n "$TOKEN" ] && check "token issued" yes yes || check "token issued" yes no

echo "== 2. wrong PIN rejected =="
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1003","pin":"9999"}')
check "wrong PIN -> 401" 401 "$code"

echo "== 3. new Loans tab API =="
LCODE=$(curl -s -o /tmp/loans.json -w '%{http_code}' "$BASE/api/portal/loans" -H "Authorization: Bearer $TOKEN")
check "GET /api/portal/loans -> 200" 200 "$LCODE"
LCOUNT=$(python3 -c 'import json;print(len(json.load(open("/tmp/loans.json"))))')
echo "      loans for MS-1002: $LCOUNT"
check "loans endpoint returns array" yes "$([ "$LCOUNT" -ge 0 ] && echo yes || echo no)"

echo "== 4. new Timesheets tab API =="
TCODE=$(curl -s -o /tmp/ts.json -w '%{http_code}' "$BASE/api/portal/timesheets" -H "Authorization: Bearer $TOKEN")
check "GET /api/portal/timesheets -> 200" 200 "$TCODE"
TCOUNT=$(python3 -c 'import json;print(len(json.load(open("/tmp/ts.json"))))')
echo "      timesheets for MS-1002: $TCOUNT"
check "timesheets endpoint returns array" yes "$([ "$TCOUNT" -ge 0 ] && echo yes || echo no)"

echo "== 5. new tabs reject missing token =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/portal/loans")
check "loans no token -> 401" 401 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/portal/timesheets")
check "timesheets no token -> 401" 401 "$code"

echo "== 6. rate limiting triggers after 5 failed attempts =="
# Use a fake identifier so we don't lock out the real MS-1002.
FAKE="rate-test-employee"
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d "{\"identifier\":\"$FAKE\",\"pin\":\"0000\"}" >/dev/null
done
# 6th attempt — should be locked out (429)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d "{\"identifier\":\"$FAKE\",\"pin\":\"0000\"}")
check "6th failed attempt -> 429 (locked)" 429 "$code"

echo "== 7. rate limit doesn't affect other identifiers =="
# MS-1002 should still be able to log in (different identifier)
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1002","pin":"1002"}')
check "MS-1002 still logs in (not locked)" 200 "$code"

echo "== 8. DB PINs are hashed (not plaintext) =="
HASHED=$(python3 << 'PYEOF'
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
total = con.execute('SELECT COUNT(*) FROM Employee').fetchone()[0]
hashed = sum(1 for row in con.execute('SELECT pin FROM Employee') if row[0] and '$' in row[0])
print(f'{hashed}/{total}')
PYEOF
)
echo "      hashed PINs: $HASHED"
check "all PINs hashed" "12/12" "$HASHED"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
