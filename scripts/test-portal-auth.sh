#!/usr/bin/env bash
# End-to-end verification of the hardened employee-portal auth.
# Covers: login, bearer auth on every route, cross-employee denial,
# PDF ownership check, leave submission, logout revocation.
set -u
BASE="http://localhost:3000/api/portal"
PASS=0; FAIL=0

check() { # $1 label, $2 expected, $3 actual
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1 ($3)";
  else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi
}

echo "== 1. bad credentials rejected =="
code=$(curl -s -o /tmp/bad.json -w '%{http_code}' -X POST "$BASE/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1002","pin":"9999"}')
check "wrong PIN -> 401" 401 "$code"

echo "== 2. valid login issues token =="
login=$(curl -s -X POST "$BASE/login" -H 'Content-Type: application/json' -d '{"identifier":"MS-1002","pin":"1002"}')
TOKEN=$(printf '%s' "$login" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
NAME=$(printf '%s' "$login" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("employee",{}).get("name",""))')
ENO=$(printf '%s' "$login" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("employee",{}).get("employeeNo",""))')
[ -n "$TOKEN" ] && check "token issued" yes yes || check "token issued" yes no
echo "      employee: $ENO / $NAME / token=${TOKEN:0:8}..."

AUTH="Authorization: Bearer $TOKEN"

echo "== 3. routes reject missing token =="
for ep in me payslips leave; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$ep")
  check "GET /$ep no token -> 401" 401 "$code"
done
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/leave" -H 'Content-Type: application/json' -d '{"type":"sick","startDate":"2026-12-01","endDate":"2026-12-02"}')
check "POST /leave no token -> 401" 401 "$code"

echo "== 4. routes reject forged/unknown token =="
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me" -H 'Authorization: Bearer deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef')
check "GET /me bogus token -> 401" 401 "$code"

echo "== 5. session-scoped data with valid token =="
code=$(curl -s -o /tmp/me.json -w '%{http_code}' "$BASE/me" -H "$AUTH")
check "GET /me -> 200" 200 "$code"
me_eno=$(python3 -c 'import json;print(json.load(open("/tmp/me.json")).get("employee",{}).get("employeeNo",""))')
check "/me returns signed-in employee" "$ENO" "$me_eno"

code=$(curl -s -o /tmp/slips.json -w '%{http_code}' "$BASE/payslips" -H "$AUTH")
check "GET /payslips -> 200" 200 "$code"
slip_count=$(python3 -c 'import json;print(len(json.load(open("/tmp/slips.json"))))')
echo "      payslips visible: $slip_count"
MY_SLIP=$(python3 -c 'import json;d=json.load(open("/tmp/slips.json"));print(d[0]["id"] if d else "")')

echo "== 6. cross-employee data isolation =="
OTHER_SLIP=$(python3 - <<'EOF'
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
row = con.execute("""
  SELECT p.id FROM Payslip p
  JOIN Employee e ON e.id = p.employeeId
  WHERE e.employeeNo <> 'MS-1002'
  ORDER BY p.id LIMIT 1""").fetchone()
print(row[0] if row else "")
EOF
)
if [ -n "$OTHER_SLIP" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/payslips/$OTHER_SLIP/pdf" -H "$AUTH")
  check "other employee's payslip PDF -> 403" 403 "$code"
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/payslips/$OTHER_SLIP/pdf")
  check "other payslip PDF, no token -> 401" 401 "$code"
else
  echo "SKIP  no second-employee payslip in db"
fi

echo "== 7. own payslip PDF downloads =="
if [ -n "$MY_SLIP" ]; then
  code=$(curl -s -o /tmp/slip.pdf -w '%{http_code}' "$BASE/payslips/$MY_SLIP/pdf" -H "$AUTH")
  check "own payslip PDF -> 200" 200 "$code"
  head -c 4 /tmp/slip.pdf | rg -q '%PDF' && check "content is PDF" yes yes || check "content is PDF" yes no
else
  echo "SKIP  MS-1002 has no payslips"
fi

echo "== 8. leave submission via session =="
code=$(curl -s -o /tmp/leave.json -w '%{http_code}' -X POST "$BASE/leave" -H "Content-Type: application/json" -H "$AUTH" -d '{"type":"annual","startDate":"2027-01-11","endDate":"2027-01-15","reason":"e2e auth test"}')
check "POST /leave -> 201" 201 "$code"
status=$(python3 -c 'import json;print(json.load(open("/tmp/leave.json")).get("status",""))')
check "created leave is pending" pending "$status"

echo "== 9. logout revokes session server-side =="
code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE/logout" -H "$AUTH")
check "DELETE /logout -> 200" 200 "$code"
code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/me" -H "$AUTH")
check "token dead after logout -> 401" 401 "$code"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
