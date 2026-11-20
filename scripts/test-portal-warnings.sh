#!/usr/bin/env bash
# E2E test for the separated employee portal + warnings feature.
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi; }
pj() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

echo "== 1. /portal route serves the standalone employee portal =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/portal")
check "/portal returns 200" 200 "$code"
curl -s "$BASE/portal" | rg -q 'Employee App' && check "/portal renders portal UI" yes yes || check "/portal renders portal UI" yes no

echo "== 2. admin issues a warning via API =="
MARCUS_ID=$(python3 -c "import sqlite3;print(sqlite3.connect('/home/z/my-project/db/custom.db').execute(\"SELECT id FROM Employee WHERE employeeNo='MS-1002'\").fetchone()[0])")
WARN=$(curl -s -X POST "$BASE/api/warnings" -H 'Content-Type: application/json' -d "{\"employeeId\":\"$MARCUS_ID\",\"type\":\"safety\",\"subject\":\"E2E test warning\",\"details\":\"Created by automated test\",\"issuedBy\":\"Test\"}")
WID=$(printf '%s' "$WARN" | pj "['id']")
WTYPE=$(printf '%s' "$WARN" | pj "['type']")
check "warning created with id" yes "$([ -n "$WID" ] && echo yes || echo no)"
check "type is safety" safety "$WTYPE"

echo "== 3. employee logs in and sees their warnings =="
LOGIN=$(curl -s -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1002","pin":"1002"}')
TOKEN=$(printf '%s' "$LOGIN" | pj "['token']")
PWS=$(curl -s "$BASE/api/portal/warnings" -H "Authorization: Bearer $TOKEN")
WCOUNT=$(printf '%s' "$PWS" | pj "[len(x) for x in [json.load(__import__('sys').stdin)]][0]" 2>/dev/null || printf '%s' "$PWS" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
echo "      warnings visible to MS-1002: $WCOUNT (expect 3)"
check "employee sees 3 warnings" 3 "$WCOUNT"

echo "== 4. cross-employee isolation =="
LOGIN2=$(curl -s -X POST "$BASE/api/portal/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1001","pin":"1001"}')
TOKEN2=$(printf '%s' "$LOGIN2" | pj "['token']")
PWS2=$(curl -s "$BASE/api/portal/warnings" -H "Authorization: Bearer $TOKEN2")
WCOUNT2=$(printf '%s' "$PWS2" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)))')
echo "      warnings visible to MS-1001: $WCOUNT2 (expect 0)"
check "other employee sees 0 warnings" 0 "$WCOUNT2"

echo "== 5. forged token rejected =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/portal/warnings" -H 'Authorization: Bearer forgedtoken')
check "forged token -> 401" 401 "$code"

echo "== 6. employee acknowledges the test warning =="
ACK=$(curl -s -X PATCH "$BASE/api/portal/warnings" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "{\"id\":\"$WID\"}")
ASTATUS=$(printf '%s' "$ACK" | pj "['status']")
check "acknowledged status" acknowledged "$ASTATUS"

echo "== 7. /me activeWarnings count reflects acknowledgement =="
ME=$(curl -s "$BASE/api/portal/me" -H "Authorization: Bearer $TOKEN")
AW=$(printf '%s' "$ME" | python3 -c 'import sys,json;print(json.load(sys.stdin)["stats"]["activeWarnings"])')
echo "      activeWarnings for MS-1002: $AW (expect 1)"
check "activeWarnings=1 after acknowledge" 1 "$AW"

echo "== 8. cannot acknowledge someone else's warning =="
code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE/api/portal/warnings" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN2" -d "{\"id\":\"$WID\"}")
check "cross-emp acknowledge -> 404" 404 "$code"

echo "== 9. admin sees updated status =="
ADMIN_W=$(curl -s "$BASE/api/warnings?employeeId=$MARCUS_ID")
ADMIN_STATUS=$(printf '%s' "$ADMIN_W" | python3 -c "import sys,json;d=[w for w in json.load(sys.stdin) if w['id']=='$WID'];print(d[0]['status'] if d else 'not-found')")
check "admin sees acknowledged" acknowledged "$ADMIN_STATUS"

echo "== cleanup =="
curl -s -X DELETE "$BASE/api/warnings/$WID" >/dev/null && echo "      test warning deleted"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
