#!/usr/bin/env bash
# Verify form standardization (no CAR WASH / CLEANING), bulk upload APIs,
# and the WH- -> MS- employee-number fix.
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "PASS  $1"; else FAIL=$((FAIL+1)); echo "FAIL  $1 (expected $2, got $3)"; fi; }

echo "== 1. incident-report form PDF has no department tag =="
# Find an existing incident-report submission, or skip if none.
SUB_ID=$(python3 -c "
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
row = con.execute(\"SELECT id FROM FormSubmission WHERE templateId='incident-report' LIMIT 1\").fetchone()
print(row[0] if row else '')
")
if [ -n "$SUB_ID" ]; then
  curl -s "$BASE/api/forms/$SUB_ID/pdf" -o /tmp/form.pdf
  if rg -q 'CAR WASH' /tmp/form.pdf; then check "PDF contains 'CAR WASH'" no yes; else check "PDF contains 'CAR WASH'" no no; fi
  if rg -q 'CLEANING' /tmp/form.pdf; then check "PDF contains 'CLEANING'" no yes; else check "PDF contains 'CLEANING'" no no; fi
  if rg -q 'MANAGEMENT SYSTEM' /tmp/form.pdf; then check "PDF has 'MANAGEMENT SYSTEM'" yes yes; else check "PDF has 'MANAGEMENT SYSTEM'" yes no; fi
  if rg -q 'MS-IR-01' /tmp/form.pdf; then check "PDF docId is MS-IR-01" yes yes; else check "PDF docId is MS-IR-01" yes no; fi
else
  echo "SKIP  no incident-report submission in DB"
fi

echo "== 2. WH- prefix replaced with MS- =="
# Create an employee without employeeNo -> should auto-generate MS-####
NEWEMP=$(curl -s -X POST "$BASE/api/employees" -H 'Content-Type: application/json' -d '{"name":"Test Prefix Check","email":"prefix.test@example.com","position":"Tester","department":"Operations"}')
GEN_NO=$(printf '%s' "$NEWEMP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("employeeNo",""))' 2>/dev/null)
echo "      generated: $GEN_NO"
case "$GEN_NO" in
  MS-*) check "auto employeeNo uses MS- prefix" "MS-" "$(echo "$GEN_NO" | cut -c1-3)";;
  WH-*) check "auto employeeNo uses MS- prefix" "MS-" "WH- (still old!)";;
  *) check "auto employeeNo uses MS- prefix" "MS-" "$GEN_NO";;
esac
# cleanup
EMP_ID=$(printf '%s' "$NEWEMP" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
[ -n "$EMP_ID" ] && curl -s -X DELETE "$BASE/api/employees/$EMP_ID" >/dev/null

echo "== 3. bulk employee upload =="
BULK=$(curl -s -X POST "$BASE/api/employees/bulk" -H 'Content-Type: application/json' -d '{
  "rows": [
    {"name":"Bulk Alice","email":"bulk.alice@example.com","position":"Driver","department":"Logistics","salary":2500},
    {"name":"Bulk Bob","email":"bulk.bob@example.com","position":"Cleaner","department":"Operations","salary":2200},
    {"name":"Bulk Carol","email":"bulk.carol@example.com","position":"Mechanic","department":"Engineering","salary":3100},
    {"name":"Bulk Dup","email":"bulk.alice@example.com"},
    {"name":"","email":"bulk.noName@example.com"}
  ]
}')
echo "      response: $(printf '%s' "$BULK" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f"created={d.get(\"created\")} errors={len(d.get(\"errors\",[]))} total={d.get(\"total\")}")')"
CREATED=$(printf '%s' "$BULK" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("created",0))')
ERRCOUNT=$(printf '%s' "$BULK" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("errors\",[])))' 2>/dev/null || printf '%s' "$BULK" | python3 -c 'import sys,json;print(len(json.load(sys.stdin).get("errors",[])))')
check "bulk employee created=3" 3 "$CREATED"
check "bulk employee errors=2" 2 "$ERRCOUNT"
# cleanup the 3 created
python3 -c "
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
n = con.execute(\"DELETE FROM Employee WHERE email LIKE 'bulk.%@example.com'\").rowcount
con.commit(); print('      cleaned:', n)
"

echo "== 4. bulk vehicle upload =="
VBULK=$(curl -s -X POST "$BASE/api/fleet/vehicles/bulk" -H 'Content-Type: application/json' -d '{
  "rows": [
    {"plateNumber":"BULK-001","brand":"Toyota","model":"Hilux","year":2022,"type":"truck","color":"white"},
    {"plateNumber":"BULK-002","brand":"Ford","model":"Transit","year":2021,"type":"van","color":"blue"},
    {"plateNumber":"BULK-001","brand":"Duplicate","model":"X","year":2020}
  ]
}')
echo "      response: $(printf '%s' "$VBULK" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(f\"created={d.get(\"created\")} errors={len(d.get(\"errors\",[]))}\")')"
VCREATED=$(printf '%s' "$VBULK" | python3 -c 'import sys,json;print(json.load(sys.stdin).get(\"created\",0))' 2>/dev/null || printf '%s' "$VBULK" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("created",0))')
check "bulk vehicle created=2" 2 "$VCREATED"
# cleanup
python3 -c "
import sqlite3
con = sqlite3.connect('/home/z/my-project/db/custom.db')
n = con.execute(\"DELETE FROM Vehicle WHERE plateNumber LIKE 'BULK-%'\").rowcount
con.commit(); print('      cleaned:', n)
"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
